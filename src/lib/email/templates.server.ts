const SITE = "https://marketwatch.vn";
const BRAND = "MarketWatch";
const GOLD = "#C9A24A";

interface ShellFooter {
  /** Token-based one-click unsubscribe link (newsletter / digest / alert) */
  unsubUrl?: string | null;
  /** Account-level email preferences page */
  manageUrl?: string | null;
  /** Short label describing what is being unsubscribed (e.g. "bản tin vàng") */
  unsubLabel?: string | null;
}

function shell(title: string, inner: string, footer?: ShellFooter): string {
  const unsubUrl = footer?.unsubUrl;
  const manageUrl = footer?.manageUrl;
  const unsubLabel = footer?.unsubLabel || "email này";
  const prefBlock = (unsubUrl || manageUrl)
    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #ececec;color:#999;font-size:12px;line-height:1.6;">
         Không muốn nhận ${escape(unsubLabel)}?
         ${unsubUrl ? `<a href="${unsubUrl}" style="color:#555;text-decoration:underline;">Hủy đăng ký một lần</a>` : ""}
         ${unsubUrl && manageUrl ? " &nbsp;·&nbsp; " : ""}
         ${manageUrl ? `<a href="${manageUrl}" style="color:#555;text-decoration:underline;">Quản lý email</a>` : ""}
       </div>`
    : "";
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
        ${prefBlock}
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

export function welcomeEmail(opts: { name?: string | null; manageUrl?: string; unsubUrl?: string }) {
  const greet = opts.name ? `Xin chào ${escape(opts.name)},` : "Xin chào,";
  const html = shell(`Chào mừng đến với ${BRAND}`, `
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Chào mừng đến với MarketWatch</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">${greet}</p>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Tài khoản của bạn đã sẵn sàng. Bạn có thể theo dõi giá vàng, tiền điện tử, ngoại tệ và đặt cảnh báo giá theo ngưỡng riêng — chúng tôi sẽ gửi email ngay khi thị trường chạm mức.</p>
    ${button(SITE, "Vào trang chủ")}
    <p style="margin:18px 0 0;line-height:1.6;color:#666;font-size:13px;">Dữ liệu trên MarketWatch chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.</p>
  `, { unsubUrl: opts.unsubUrl, manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/email`, unsubLabel: "email thông báo" });
  return { subject: "Chào mừng đến với MarketWatch", html };
}

export function newsletterConfirmEmail(opts: { email: string; unsubUrl?: string; manageUrl?: string }) {
  const html = shell("Đã đăng ký nhận tin MarketWatch", `
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Đăng ký thành công</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Cảm ơn bạn đã đăng ký nhận bản tin MarketWatch. Chúng tôi sẽ gửi bản tin chọn lọc về biến động giá vàng, crypto và ngoại tệ tới <strong>${escape(opts.email)}</strong>.</p>
    ${button(SITE, "Khám phá MarketWatch")}
    <p style="margin:18px 0 0;line-height:1.6;color:#666;font-size:13px;">Nếu bạn không thực hiện đăng ký này, có thể bỏ qua email — chúng tôi sẽ không gửi thêm khi bạn không xác nhận sử dụng.</p>
  `, { unsubUrl: opts.unsubUrl, manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/ban-tin`, unsubLabel: "bản tin MarketWatch" });
  return { subject: "Bạn đã đăng ký nhận tin MarketWatch", html };
}

export function contactConfirmEmail(opts: { name: string; message: string; manageUrl?: string }) {
  const html = shell("Đã nhận liên hệ của bạn", `
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Cảm ơn ${escape(opts.name)}!</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Chúng tôi đã nhận được phản ánh của bạn và sẽ phản hồi trong 24–72 giờ làm việc.</p>
    <div style="margin:16px 0;padding:14px 16px;border-left:3px solid ${GOLD};background:#fafafa;color:#444;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escape(opts.message)}</div>
    <p style="margin:0;line-height:1.6;color:#666;font-size:13px;">Bạn có thể trả lời trực tiếp email này để bổ sung thông tin.</p>
  `, { manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/email`, unsubLabel: "email từ MarketWatch" });
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

export function priceAlertEmail(opts: { symbol: string; assetType: "crypto" | "gold"; direction: "above" | "below"; threshold: number; currentPrice: number; manageUrl?: string }) {
  const dirLabel = opts.direction === "above" ? "vượt mốc" : "giảm dưới";
  const assetLabel = opts.assetType === "gold" ? "vàng" : opts.symbol;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
  const html = shell(`${opts.symbol} ${dirLabel} ${fmt(opts.threshold)}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Cảnh báo giá</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">${escape(opts.symbol)} ${dirLabel} ${fmt(opts.threshold)}</h1>
    <p style="margin:0 0 8px;line-height:1.6;color:#333;">Giá ${escape(assetLabel)} hiện tại: <strong>${fmt(opts.currentPrice)}</strong></p>
    <p style="margin:0 0 12px;line-height:1.6;color:#666;font-size:13px;">Cảnh báo đã được đánh dấu hoàn tất. Bạn có thể tạo cảnh báo mới trên trang chủ.</p>
    ${button(SITE, "Mở MarketWatch")}
  `, { manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/canh-bao`, unsubLabel: "cảnh báo giá" });
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

// ---------- Auth: xác nhận đăng ký ----------
export function signupConfirmEmail(opts: { name?: string | null; actionLink: string }) {
  const greet = opts.name ? `Xin chào ${escape(opts.name)},` : "Xin chào,";
  const html = shell("Xác nhận đăng ký MarketWatch", `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Xác thực email</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Xác nhận đăng ký tài khoản</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">${greet}</p>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Cảm ơn bạn đã đăng ký MarketWatch. Vui lòng bấm nút bên dưới để xác nhận địa chỉ email của bạn. Liên kết có hiệu lực trong 24 giờ.</p>
    ${button(opts.actionLink, "Xác nhận email")}
    <p style="margin:0 0 6px;font-size:12px;color:#666;">Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:</p>
    <p style="margin:0 0 18px;font-size:12px;color:#0a58ca;word-break:break-all;">${escape(opts.actionLink)}</p>
    <p style="margin:0;font-size:12px;color:#999;">Bạn không tạo tài khoản này? Bỏ qua email — không có thay đổi nào được thực hiện.</p>
  `);
  return { subject: "Xác nhận đăng ký MarketWatch", html };
}

// ---------- Auth: OTP đăng nhập ----------
export function loginOtpEmail(opts: { code: string; minutesValid?: number }) {
  const mins = opts.minutesValid ?? 10;
  const code = String(opts.code).replace(/\s+/g, "");
  const html = shell("Mã đăng nhập MarketWatch", `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Mã xác thực một lần</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Mã đăng nhập của bạn</h1>
    <p style="margin:0 0 16px;line-height:1.6;color:#333;">Nhập mã sau để hoàn tất đăng nhập. Mã có hiệu lực trong <strong>${mins} phút</strong> và chỉ dùng được một lần.</p>
    <div style="margin:20px 0;padding:18px 24px;background:#fafafa;border:1px dashed #d6d6d6;border-radius:10px;text-align:center;">
      <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:30px;letter-spacing:0.4em;font-weight:700;color:#111;">${escape(code)}</div>
    </div>
    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Không thực hiện đăng nhập này? Hãy đổi mật khẩu MarketWatch ngay và liên hệ <a href="mailto:contact@marketwatch.vn" style="color:#555;">contact@marketwatch.vn</a>.</p>
  `);
  return { subject: `Mã đăng nhập MarketWatch: ${code}`, html };
}

// ---------- Auth: magic link ----------
export function magicLinkEmail(opts: { actionLink: string; minutesValid?: number }) {
  const mins = opts.minutesValid ?? 60;
  const html = shell("Liên kết đăng nhập MarketWatch", `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Đăng nhập an toàn</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Đăng nhập MarketWatch</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Bấm nút bên dưới để đăng nhập vào tài khoản của bạn. Liên kết có hiệu lực trong ${mins} phút và chỉ dùng được một lần.</p>
    ${button(opts.actionLink, "Đăng nhập ngay")}
    <p style="margin:0 0 6px;font-size:12px;color:#666;">Hoặc dán liên kết sau vào trình duyệt:</p>
    <p style="margin:0 0 18px;font-size:12px;color:#0a58ca;word-break:break-all;">${escape(opts.actionLink)}</p>
    <p style="margin:0;font-size:12px;color:#999;">Bạn không yêu cầu đăng nhập? Có thể bỏ qua email này.</p>
  `);
  return { subject: "Liên kết đăng nhập MarketWatch", html };
}

// ---------- Auth: đặt lại mật khẩu (dùng chung shell) ----------
export function passwordResetEmail(opts: { actionLink: string }) {
  const html = shell("Đặt lại mật khẩu MarketWatch", `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Bảo mật tài khoản</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">Đặt lại mật khẩu</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để chọn mật khẩu mới. Liên kết có hiệu lực trong 60 phút.</p>
    ${button(opts.actionLink, "Đặt lại mật khẩu")}
    <p style="margin:0 0 6px;font-size:12px;color:#666;">Nếu nút không hoạt động, sao chép liên kết sau:</p>
    <p style="margin:0 0 18px;font-size:12px;color:#0a58ca;word-break:break-all;">${escape(opts.actionLink)}</p>
    <p style="margin:0;font-size:12px;color:#999;">Không yêu cầu việc này? Bỏ qua email — mật khẩu của bạn vẫn an toàn.</p>
  `);
  return { subject: "Đặt lại mật khẩu MarketWatch", html };
}

// ---------- Bản tin giá vàng ----------
export interface GoldDigestRow { label: string; buy?: number | null; sell: number; changePct?: number | null }
export function goldDigestEmail(opts: { dateLabel: string; rows: GoldDigestRow[]; unsubUrl?: string; manageUrl?: string }) {
  const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
  const rows = opts.rows.map((r) => {
    const ch = typeof r.changePct === "number" ? r.changePct : null;
    const chColor = ch === null ? "#888" : ch >= 0 ? "#0a8f4a" : "#c8312f";
    const chText = ch === null ? "—" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111;">${escape(r.label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#333;">${r.buy != null ? fmtVnd(r.buy) : "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#111;font-weight:600;">${fmtVnd(r.sell)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:${chColor};font-weight:600;">${chText}</td>
    </tr>`;
  }).join("");
  const html = shell(`Bản tin giá vàng • ${opts.dateLabel}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Bản tin giá vàng</div>
    <h1 style="font-size:22px;margin:0 0 6px;color:#111;">Giá vàng ${escape(opts.dateLabel)}</h1>
    <p style="margin:0 0 14px;color:#666;font-size:13px;">Đơn vị: VNĐ/lượng. Dữ liệu cập nhật tự động từ MarketWatch.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#fafafa;">
        <th align="left" style="padding:10px 12px;color:#888;font-weight:500;">Loại vàng</th>
        <th align="right" style="padding:10px 12px;color:#888;font-weight:500;">Mua</th>
        <th align="right" style="padding:10px 12px;color:#888;font-weight:500;">Bán</th>
        <th align="right" style="padding:10px 12px;color:#888;font-weight:500;">24h</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${button(SITE + "/gia-vang", "Xem biểu đồ chi tiết")}
  `, { unsubUrl: opts.unsubUrl, manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/ban-tin`, unsubLabel: "bản tin vàng" });
  return { subject: `Giá vàng ${opts.dateLabel} — MarketWatch`, html };
}

// ---------- Bản tin tiền điện tử ----------
export interface CoinDigestRow { symbol: string; name?: string; price: number; changePct: number }
export function cryptoDigestEmail(opts: { dateLabel: string; rows: CoinDigestRow[]; unsubUrl?: string; manageUrl?: string }) {
  const fmt = (n: number) => n >= 1
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n)
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 6 }).format(n);
  const rows = opts.rows.map((r) => {
    const up = r.changePct >= 0;
    const color = up ? "#0a8f4a" : "#c8312f";
    const arrow = up ? "▲" : "▼";
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
        <div style="font-weight:600;color:#111;">${escape(r.symbol.toUpperCase())}</div>
        ${r.name ? `<div style="font-size:11px;color:#888;">${escape(r.name)}</div>` : ""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#111;font-weight:600;">${fmt(r.price)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:${color};font-weight:600;">${arrow} ${up ? "+" : ""}${r.changePct.toFixed(2)}%</td>
    </tr>`;
  }).join("");
  const html = shell(`Bản tin Crypto • ${opts.dateLabel}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Bản tin tiền điện tử</div>
    <h1 style="font-size:22px;margin:0 0 6px;color:#111;">Top biến động ${escape(opts.dateLabel)}</h1>
    <p style="margin:0 0 14px;color:#666;font-size:13px;">Giá USD cập nhật theo dữ liệu thị trường gần nhất.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#fafafa;">
        <th align="left" style="padding:10px 12px;color:#888;font-weight:500;">Coin</th>
        <th align="right" style="padding:10px 12px;color:#888;font-weight:500;">Giá</th>
        <th align="right" style="padding:10px 12px;color:#888;font-weight:500;">24h</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${button(SITE + "/crypto", "Mở bảng giá Crypto")}
  `, { unsubUrl: opts.unsubUrl, manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/ban-tin`, unsubLabel: "bản tin crypto" });
  return { subject: `Crypto ${opts.dateLabel} — MarketWatch`, html };
}

// ---------- Bản tin tỷ giá ngoại tệ ----------
export interface FxDigestRow { pair: string; rate: number; changePct?: number | null }
export function fxDigestEmail(opts: { dateLabel: string; rows: FxDigestRow[]; unsubUrl?: string; manageUrl?: string }) {
  const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: n >= 1000 ? 0 : 4 }).format(n);
  const rows = opts.rows.map((r) => {
    const ch = typeof r.changePct === "number" ? r.changePct : null;
    const color = ch === null ? "#888" : ch >= 0 ? "#0a8f4a" : "#c8312f";
    const chText = ch === null ? "—" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111;">${escape(r.pair)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#111;font-weight:600;">${fmt(r.rate)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:${color};font-weight:600;">${chText}</td>
    </tr>`;
  }).join("");
  const html = shell(`Tỷ giá ngoại tệ • ${opts.dateLabel}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Bản tin ngoại tệ</div>
    <h1 style="font-size:22px;margin:0 0 6px;color:#111;">Tỷ giá ngày ${escape(opts.dateLabel)}</h1>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;border:1px solid #ececec;border-radius:8px;overflow:hidden;margin-top:8px;">
      <thead><tr style="background:#fafafa;">
        <th align="left" style="padding:10px 12px;color:#888;font-weight:500;">Cặp</th>
        <th align="right" style="padding:10px 12px;color:#888;font-weight:500;">Tỷ giá</th>
        <th align="right" style="padding:10px 12px;color:#888;font-weight:500;">24h</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${button(SITE + "/ngoai-te", "Xem chi tiết tỷ giá")}
  `, { unsubUrl: opts.unsubUrl, manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/ban-tin`, unsubLabel: "bản tin tỷ giá" });
  return { subject: `Tỷ giá ${opts.dateLabel} — MarketWatch`, html };
}

// ---------- Cảnh báo bảo mật / đăng nhập mới ----------
export function securityAlertEmail(opts: { event: string; ip?: string | null; userAgent?: string | null; whenLabel: string }) {
  const html = shell("Hoạt động đăng nhập mới", `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Cảnh báo bảo mật</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">${escape(opts.event)}</h1>
    <table style="font-size:13px;color:#333;line-height:1.7;margin:6px 0 14px;"><tbody>
      <tr><td style="color:#888;padding-right:18px;">Thời gian</td><td>${escape(opts.whenLabel)}</td></tr>
      ${opts.ip ? `<tr><td style="color:#888;padding-right:18px;">IP</td><td>${escape(opts.ip)}</td></tr>` : ""}
      ${opts.userAgent ? `<tr><td style="color:#888;padding-right:18px;">Thiết bị</td><td>${escape(opts.userAgent)}</td></tr>` : ""}
    </tbody></table>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Nếu đây là bạn, không cần làm gì. Nếu không, hãy đổi mật khẩu ngay và liên hệ <a href="mailto:contact@marketwatch.vn" style="color:#555;">contact@marketwatch.vn</a>.</p>
    ${button(SITE + "/tai-khoan/bao-mat", "Mở cài đặt bảo mật")}
  `);
  return { subject: `[Bảo mật] ${opts.event} — MarketWatch`, html };
}