import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  email: z.string().email().max(254),
  redirectTo: z.string().startsWith("/").max(512).default("/"),
});

/**
 * Gửi magic link đăng nhập qua Postmark — KHÔNG đi qua hàng đợi email
 * của Supabase Auth (vốn gửi từ no-reply@auth.lovable.cloud do hook redirect bị fail).
 *
 * Cách hoạt động:
 *   1. Dùng supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' }) để
 *      tạo `action_link` hợp lệ MÀ KHÔNG kích hoạt email mặc định của Supabase.
 *   2. Render template branded MarketWatch và gửi trực tiếp qua Postmark.
 *   3. Khi user click, Supabase Auth verify token và tạo session như bình thường.
 *
 * Để tránh leak việc email có tồn tại hay không, luôn trả về { ok: true }
 * trừ khi có lỗi server/cấu hình.
 */
export const requestMagicLink = createServerFn({ method: "POST" })
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail } = await import("@/lib/email/resend.server");
    const { magicLinkEmail } = await import("@/lib/email/templates.server");

    const siteOrigin =
      process.env.SITE_ORIGIN ??
      process.env.VITE_SITE_ORIGIN ??
      "https://marketwatch.vn";
    const redirectTo = `${siteOrigin}${data.redirectTo}`;

    // Log pending state
    const messageId = crypto.randomUUID();
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "magiclink",
      recipient_email: email,
      status: "pending",
    });

    // generateLink với type 'magiclink' chỉ trả về action_link, KHÔNG tự gửi email
    // (Supabase chỉ gửi khi gọi signInWithOtp / signInWithPassword qua client SDK).
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });

    if (linkError || !linkData?.properties?.action_link) {
      // User chưa tồn tại hoặc lỗi khác — không gửi email, không tiết lộ.
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "magiclink",
        recipient_email: email,
        status: "failed",
        error_message: linkError?.message ?? "no_action_link",
      });
      // Trả về ok để không leak thông tin tài khoản.
      return { ok: true as const };
    }

    const actionLink = linkData.properties.action_link;

    try {
      const { subject, html } = magicLinkEmail({ actionLink, minutesValid: 60 });
      const result = await sendEmail({
        to: email,
        subject,
        html,
        tags: ["auth-magic-link"],
      });
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "magiclink",
        recipient_email: email,
        status: "sent",
        metadata: {
          provider: "postmark",
          provider_message_id: result.id ?? null,
        },
      });
      return { ok: true as const };
    } catch (err: any) {
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "magiclink",
        recipient_email: email,
        status: "failed",
        error_message: err?.message ?? "postmark_send_failed",
      });
      // Vẫn trả về ok để không leak; admin có thể xem log để debug.
      return { ok: true as const };
    }
  });