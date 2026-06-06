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
    const tokenHash = linkData.properties.hashed_token;

    // Rewrite link để dùng domain marketwatch.vn thay vì *.supabase.co.
    // Route /xac-thuc-dang-nhap sẽ gọi verifyOtp({ token_hash, type }) ở client.
    const verifyUrl = new URL("/xac-thuc-dang-nhap", siteOrigin);
    verifyUrl.searchParams.set("token_hash", tokenHash);
    verifyUrl.searchParams.set("type", "magiclink");
    verifyUrl.searchParams.set("next", data.redirectTo);
    const brandedLink = verifyUrl.toString();

    try {
      const { subject, html } = magicLinkEmail({ actionLink: brandedLink, minutesValid: 60 });
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
          original_action_link: actionLink,
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

const VerifyLogInput = z.object({
  type: z.enum(["magiclink", "signup", "recovery", "invite", "email_change"]),
  status: z.enum(["success", "failed"]),
  error_message: z.string().max(500).optional(),
  has_token: z.boolean().default(true),
});

/**
 * Ghi log kết quả verifyOtp ở phía server để theo dõi tỷ lệ thành công/thất bại.
 * Không cần auth (link verify có thể được click bởi anonymous user / trình duyệt mới).
 * Không log token_hash để tránh leak thông tin nhạy cảm.
 */
export const logVerifyOtpResult = createServerFn({ method: "POST" })
  .inputValidator((input) => VerifyLogInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("email_send_log").insert({
        message_id: crypto.randomUUID(),
        template_name: `${data.type}_verify`,
        recipient_email: "unknown@verify.local",
        status: data.status === "success" ? "delivered" : "failed",
        error_message: data.error_message ?? null,
        metadata: {
          event: "verify_otp",
          otp_type: data.type,
          has_token: data.has_token,
        },
      });
    } catch (err) {
      // Best-effort logging — không bao giờ làm fail UI.
      console.error("[logVerifyOtpResult] insert failed", err);
    }
    return { ok: true as const };
  });