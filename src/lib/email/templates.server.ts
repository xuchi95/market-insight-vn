const SITE = "https://marketwatch.vn";
const BRAND = "MarketWatch";
const GOLD = "#C9A24A";

function shell(title: string, inner: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #ececec;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;">
          <span style="color:${GOLD};">Market</span><span style="color:#111111;">Watch</span>
        </div>
        <div style="font-size:12px;color:#888;letter-spacing:0.12em;text-transform:uppercase;margin-top:4px;">Nhật báo dữ liệu tài chính</div>
      </td></tr>
      <tr><td style="padding:28px;">${inner}</td></tr>
      <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #f0f0f0;font-size:12px;color:#888;line-height:1.6;">
        Bạn nhận được email này từ ${BRAND}. Mọi yêu cầu hỗ trợ vui lòng gửi tới
        <a href="mailto:contact@marketwatch.vn" style="color:#555;">contact@marketwatch.vn</a>.<br/>
        © ${new Date().getFullYear()} MarketWatch · <a href="${SITE}" style="color:#555;">marketwatch.vn</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;"><tr><td style="background:${GOLD};border-radius:8px;"><a href="${href}" style="display:inline-block;padding:12px 22px;color:#111;font-weight:600;text-decoration:none;font-size:14px;">${escape(label)}</a></td></tr></table>`;
}

export function welcomeEmail(opts: { name?: string | null }) {
  const greet = opts.name ? `Xin chào ${escape(opts.name)},` : "Xin chào,";
  const html = shell(`Chào mừng đến với ${BRAND}`, `
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Chào mừng đến với MarketWatch</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">${greet}</p>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Tài khoản của bạn đã sẵn sàng. Bạn có thể theo dõi giá vàng, tiền điện tử, ngoại tệ và đặt cảnh báo giá theo ngưỡng riêng — chúng tôi sẽ gửi email ngay khi thị trường chạm mức.</p>
    ${button(SITE, "Vào trang chủ")}
    <p style="margin:18px 0 0;line-height:1.6;color:#666;font-size:13px;">Dữ liệu trên MarketWatch chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.</p>
  `);
  return { subject: "Chào mừng đến với MarketWatch", html };
}

export function newsletterConfirmEmail(opts: { email: string }) {
  const html = shell("Đã đăng ký nhận tin MarketWatch", `
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Đăng ký thành công</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Cảm ơn bạn đã đăng ký nhận bản tin MarketWatch. Chúng tôi sẽ gửi bản tin chọn lọc về biến động giá vàng, crypto và ngoại tệ tới <strong>${escape(opts.email)}</strong>.</p>
    ${button(SITE, "Khám phá MarketWatch")}
    <p style="margin:18px 0 0;line-height:1.6;color:#666;font-size:13px;">Nếu bạn không thực hiện đăng ký này, có thể bỏ qua email — chúng tôi sẽ không gửi thêm khi bạn không xác nhận sử dụng.</p>
  `);
  return { subject: "Bạn đã đăng ký nhận tin MarketWatch", html };
}

export function contactConfirmEmail(opts: { name: string; message: string }) {
  const html = shell("Đã nhận liên hệ của bạn", `
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Cảm ơn ${escape(opts.name)}!</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Chúng tôi đã nhận được phản ánh của bạn và sẽ phản hồi trong 24–72 giờ làm việc.</p>
    <div style="margin:16px 0;padding:14px 16px;border-left:3px solid ${GOLD};background:#fafafa;color:#444;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escape(opts.message)}</div>
    <p style="margin:0;line-height:1.6;color:#666;font-size:13px;">Bạn có thể trả lời trực tiếp email này để bổ sung thông tin.</p>
  `);
  return { subject: "MarketWatch đã nhận liên hệ của bạn", html };
}

export function contactForwardEmail(opts: { name: string; email: string; subject?: string | null; message: string; ip?: string | null }) {
  const html = shell("Liên hệ mới", `
    <h1 style="font-size:18px;margin:0 0 12px;color:#111;">Liên hệ mới từ ${escape(opts.name)}</h1>
    <table style="font-size:13px;color:#333;line-height:1.7;"><tbody>
      <tr><td style="color:#888;padding-right:12px;">Email</td><td>${escape(opts.email)}</td></tr>
      ${opts.subject ? `<tr><td style="color:#888;padding-right:12px;">Tiêu đề</td><td>${escape(opts.subject)}</td></tr>` : ""}
      ${opts.ip ? `<tr><td style="color:#888;padding-right:12px;">IP</td><td>${escape(opts.ip)}</td></tr>` : ""}
    </tbody></table>
    <div style="margin:16px 0;padding:14px 16px;border-left:3px solid ${GOLD};background:#fafafa;color:#444;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escape(opts.message)}</div>
  `);
  return { subject: `[Liên hệ] ${opts.subject || opts.name}`, html };
}

export function priceAlertEmail(opts: { symbol: string; assetType: "crypto" | "gold"; direction: "above" | "below"; threshold: number; currentPrice: number }) {
  const dirLabel = opts.direction === "above" ? "vượt mốc" : "giảm dưới";
  const assetLabel = opts.assetType === "gold" ? "vàng" : opts.symbol;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
  const html = shell(`${opts.symbol} ${dirLabel} ${fmt(opts.threshold)}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Cảnh báo giá</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">${escape(opts.symbol)} ${dirLabel} ${fmt(opts.threshold)}</h1>
    <p style="margin:0 0 8px;line-height:1.6;color:#333;">Giá ${escape(assetLabel)} hiện tại: <strong>${fmt(opts.currentPrice)}</strong></p>
    <p style="margin:0 0 12px;line-height:1.6;color:#666;font-size:13px;">Cảnh báo đã được đánh dấu hoàn tất. Bạn có thể tạo cảnh báo mới trên trang chủ.</p>
    ${button(SITE, "Mở MarketWatch")}
  `);
  return { subject: `[Cảnh báo] ${opts.symbol} ${dirLabel} ${fmt(opts.threshold)}`, html };
}

export function watchlistAlertEmail(opts: {
  label: string;
  symbol: string;
  changePct: number;
  previousPrice: number;
  currentPrice: number;
  assetPath: string;
  unsubItemUrl: string;
  unsubAllUrl: string;
}) {
  const up = opts.changePct >= 0;
  const arrow = up ? "▲" : "▼";
  const color = up ? "#0a8f4a" : "#c8312f";
  const sign = up ? "+" : "";
  const fmt = (n: number) =>
    Math.abs(n) >= 1
      ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)
      : new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
  const pct = `${sign}${opts.changePct.toFixed(2)}%`;
  const title = `${opts.label} ${arrow} ${pct}`;
  const html = shell(title, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Biến động tài sản đang theo dõi</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">${escape(opts.label)} <span style="color:${color};">${arrow} ${pct}</span></h1>
    <table role="presentation" style="margin:4px 0 16px;font-size:14px;color:#333;line-height:1.7;">
      <tr><td style="color:#888;padding-right:18px;">Giá trước</td><td style="font-weight:600;">${fmt(opts.previousPrice)}</td></tr>
      <tr><td style="color:#888;padding-right:18px;">Giá hiện tại</td><td style="font-weight:700;color:${color};">${fmt(opts.currentPrice)}</td></tr>
    </table>
    <p style="margin:0 0 8px;line-height:1.6;color:#444;">Đây là cảnh báo tự động vì bạn đang theo dõi <strong>${escape(opts.symbol.toUpperCase())}</strong> và mức biến động đã vượt ngưỡng bạn cài đặt.</p>
    ${button(SITE + opts.assetPath, "Xem chi tiết")}
    <p style="margin:24px 0 0;line-height:1.6;color:#888;font-size:12px;">
      Không muốn nhận nữa?
      <a href="${opts.unsubItemUrl}" style="color:#555;">Tắt cảnh báo cho ${escape(opts.symbol.toUpperCase())}</a>
      &nbsp;·&nbsp;
      <a href="${opts.unsubAllUrl}" style="color:#555;">Tắt toàn bộ cảnh báo theo dõi</a>
    </p>
  `);
  return { subject: `${arrow} ${opts.label} ${pct} — MarketWatch`, html };
}