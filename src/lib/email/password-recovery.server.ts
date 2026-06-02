import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";

function recoveryEmailHtml(actionLink: string): string {
  return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:20px;color:#111;">Đặt lại mật khẩu MarketWatch</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#333;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để chọn mật khẩu mới. Liên kết có hiệu lực trong 60 phút.
          </p>
          <p style="margin:24px 0;">
            <a href="${actionLink}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">Đặt lại mật khẩu</a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#666;">Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#0a58ca;word-break:break-all;">${actionLink}</p>
          <p style="margin:0;font-size:12px;color:#999;">Nếu bạn không yêu cầu việc này, hãy bỏ qua email.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#999;">© MarketWatch.vn</p>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendRecoveryEmailFor(email: string, redirectTo: string): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  const actionLink = (data as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (!actionLink) throw new Error("Không lấy được liên kết khôi phục.");
  await sendEmail({
    to: email,
    subject: "Đặt lại mật khẩu MarketWatch",
    html: recoveryEmailHtml(actionLink),
    tags: ["password-recovery"],
  });
}