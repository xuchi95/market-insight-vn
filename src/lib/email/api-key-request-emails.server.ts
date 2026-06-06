// Email gửi từ địa chỉ api@marketwatch.vn cho luồng xét duyệt API key.
// Dùng HTML string đồng bộ với shell có sẵn trong templates.server.ts.
import { sendEmail } from "./resend.server";

const GOLD = "#C9A24A";
const BRAND = "MarketWatch";
const SITE = "https://marketwatch.vn";
const FROM = "MarketWatch API <api@marketwatch.vn>";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #ececec;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;">
          <span style="color:${GOLD};">Market</span><span style="color:#111111;">Watch</span>
        </div>
        <div style="font-size:11px;color:#888;letter-spacing:0.16em;text-transform:uppercase;margin-top:6px;">Developer API · api@marketwatch.vn</div>
      </td></tr>
      <tr><td style="padding:28px;">${inner}</td></tr>
      <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #f0f0f0;font-size:12px;color:#888;line-height:1.6;">
        Email này gửi từ <strong>api@marketwatch.vn</strong> liên quan tới yêu cầu API key của bạn.
        Cần hỗ trợ kỹ thuật? Trả lời email này hoặc viết tới
        <a href="mailto:contact@marketwatch.vn" style="color:#555;">contact@marketwatch.vn</a>.<br/>
        <span style="color:#bbb;">© ${new Date().getFullYear()} ${BRAND} · <a href="${SITE}" style="color:#888;text-decoration:none;">marketwatch.vn</a></span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const SCOPE_LABEL: Record<string, string> = {
  gold: "Vàng",
  crypto: "Tiền điện tử",
  fuel: "Xăng dầu",
  stocks: "Chứng khoán",
};

function scopesBadges(scopes: string[]): string {
  if (!scopes.length) return "";
  return scopes
    .map(
      (s) =>
        `<span style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;border:1px solid ${GOLD}55;background:${GOLD}11;color:#7a5a18;border-radius:999px;font-size:12px;font-weight:600;">${escape(
          SCOPE_LABEL[s] ?? s,
        )}</span>`,
    )
    .join("");
}

/** Email xác nhận đã nhận yêu cầu (gửi ngay khi user submit form). */
export async function sendApiKeyRequestReceivedEmail(params: {
  to: string;
  fullName: string;
  projectName: string;
  scopes: string[];
}): Promise<void> {
  const inner = `
    <div style="font-size:11px;color:${GOLD};letter-spacing:0.18em;font-weight:700;text-transform:uppercase;margin-bottom:10px;">Đã nhận yêu cầu</div>
    <h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 14px;line-height:1.25;">Cảm ơn ${escape(params.fullName)} 🙌</h1>
    <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 14px;">
      Chúng tôi đã nhận được yêu cầu cấp <strong>API key</strong> của bạn cho dự án
      <strong>${escape(params.projectName)}</strong>. Đội ngũ MarketWatch sẽ xem xét trong vòng
      <strong>1–2 ngày làm việc</strong> và gửi kết quả tới email này.
    </p>
    <div style="margin:18px 0;padding:14px 16px;background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;">
      <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Phạm vi dữ liệu yêu cầu</div>
      <div>${scopesBadges(params.scopes)}</div>
    </div>
    <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 4px;">
      Trong lúc chờ, bạn có thể xem trước tài liệu kỹ thuật REST/SSE và SDK TypeScript tại
      <a href="${SITE}/api-cho-nha-phat-trien" style="color:${GOLD};font-weight:600;text-decoration:none;">marketwatch.vn/api-cho-nha-phat-trien</a>.
    </p>
  `;
  await sendEmail({
    from: FROM,
    to: params.to,
    subject: `Đã nhận yêu cầu API key cho ${params.projectName} — MarketWatch`,
    html: shell("Đã nhận yêu cầu API key", inner),
    tags: ["api-key-request-received"],
  });
}

/** Email duyệt thành công — đính kèm key đầy đủ (chỉ gửi 1 lần). */
export async function sendApiKeyApprovedEmail(params: {
  to: string;
  fullName: string;
  projectName: string;
  apiKey: string;
  scopes: string[];
  adminNotes?: string | null;
}): Promise<void> {
  const notesBlock = params.adminNotes
    ? `<div style="margin-top:14px;padding:12px 14px;background:#fffaf0;border:1px solid ${GOLD}55;border-radius:10px;font-size:13px;color:#5a4310;line-height:1.65;"><strong style="color:${GOLD};">Ghi chú từ MarketWatch:</strong><br/>${escape(params.adminNotes)}</div>`
    : "";
  const inner = `
    <div style="font-size:11px;color:#138a4a;letter-spacing:0.18em;font-weight:700;text-transform:uppercase;margin-bottom:10px;">✓ Đã duyệt</div>
    <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 14px;line-height:1.25;">Chúc mừng, API key của bạn đã sẵn sàng 🎉</h1>
    <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 16px;">
      Xin chào <strong>${escape(params.fullName)}</strong>, yêu cầu API key cho dự án
      <strong>${escape(params.projectName)}</strong> đã được duyệt. Bạn có thể bắt đầu tích hợp ngay hôm nay.
    </p>

    <div style="margin:18px 0;padding:16px;background:#0d0d0d;border:1px solid ${GOLD};border-radius:12px;">
      <div style="font-size:11px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">API Key của bạn</div>
      <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:14px;color:#f0d78c;word-break:break-all;line-height:1.5;">${escape(params.apiKey)}</div>
    </div>
    <p style="font-size:13px;color:#a23939;line-height:1.6;margin:0 0 14px;">
      ⚠️ <strong>Hãy lưu key này ngay</strong> — vì lý do bảo mật, MarketWatch sẽ không hiển thị lại key đầy đủ. Nếu mất, bạn cần yêu cầu cấp lại.
    </p>

    <div style="margin:18px 0;padding:14px 16px;background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;">
      <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Phạm vi đã cấp</div>
      <div>${scopesBadges(params.scopes)}</div>
    </div>

    <div style="margin:22px 0 6px;font-size:14px;color:#222;font-weight:600;">Bắt đầu nhanh</div>
    <pre style="margin:6px 0 0;padding:14px;background:#f7f7f4;border:1px solid #ececec;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;color:#222;overflow-x:auto;">curl -H "x-api-key: ${escape(params.apiKey)}" \\
  "${SITE}/api/public/v1/snapshot?scopes=${escape(params.scopes.join(",") || "gold,crypto")}"</pre>

    <p style="font-size:14px;line-height:1.7;color:#555;margin:18px 0 0;">
      Tài liệu đầy đủ:
      <a href="${SITE}/api-cho-nha-phat-trien" style="color:${GOLD};font-weight:600;text-decoration:none;">marketwatch.vn/api-cho-nha-phat-trien</a>
    </p>
    ${notesBlock}
  `;
  await sendEmail({
    from: FROM,
    to: params.to,
    subject: `🎉 API key của bạn đã sẵn sàng — ${params.projectName}`,
    html: shell("API key đã được duyệt", inner),
    tags: ["api-key-request-approved"],
  });
}

/** Email từ chối — kèm lý do thân thiện và hướng dẫn nộp lại. */
export async function sendApiKeyRejectedEmail(params: {
  to: string;
  fullName: string;
  projectName: string;
  reason?: string | null;
}): Promise<void> {
  const reasonBlock = params.reason
    ? `<div style="margin:16px 0;padding:14px 16px;background:#fff5f5;border:1px solid #f3c5c5;border-radius:10px;font-size:14px;color:#7a2020;line-height:1.65;"><strong>Lý do:</strong><br/>${escape(params.reason)}</div>`
    : "";
  const inner = `
    <div style="font-size:11px;color:#a23939;letter-spacing:0.18em;font-weight:700;text-transform:uppercase;margin-bottom:10px;">Yêu cầu chưa được duyệt</div>
    <h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 14px;line-height:1.25;">Cảm ơn ${escape(params.fullName)} đã quan tâm</h1>
    <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 12px;">
      Sau khi xem xét, MarketWatch rất tiếc chưa thể cấp API key cho dự án
      <strong>${escape(params.projectName)}</strong> vào lúc này.
    </p>
    ${reasonBlock}
    <p style="font-size:14px;line-height:1.7;color:#555;margin:14px 0 0;">
      Bạn hoàn toàn có thể <a href="${SITE}/yeu-cau-api-key" style="color:${GOLD};font-weight:600;text-decoration:none;">nộp lại yêu cầu</a> với thông tin bổ sung,
      hoặc trao đổi trực tiếp qua <a href="mailto:contact@marketwatch.vn" style="color:${GOLD};font-weight:600;text-decoration:none;">contact@marketwatch.vn</a> để được tư vấn phương án phù hợp.
    </p>
    <p style="font-size:14px;line-height:1.7;color:#555;margin:14px 0 0;">
      Chúc bạn nhiều thành công với dự án của mình 🙏
    </p>
  `;
  await sendEmail({
    from: FROM,
    to: params.to,
    subject: `Về yêu cầu API key cho ${params.projectName} — MarketWatch`,
    html: shell("Yêu cầu API key chưa được duyệt", inner),
    tags: ["api-key-request-rejected"],
  });
}