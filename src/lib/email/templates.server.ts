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
  const lead = opts.rows[0];
  const leadCh = lead && typeof lead.changePct === "number" ? lead.changePct : null;
  const leadDir = leadCh === null ? "đi ngang" : leadCh >= 0 ? "tăng" : "giảm";
  const leadColor = leadCh === null ? "#666" : leadCh >= 0 ? "#0a8f4a" : "#c8312f";
  const leadPct = leadCh === null ? "" : ` ${leadCh >= 0 ? "+" : ""}${leadCh.toFixed(2)}%`;
  const summary = lead
    ? `Phiên giao dịch ngày ${escape(opts.dateLabel)} ghi nhận <strong>${escape(lead.label)}</strong> ${leadDir}<span style="color:${leadColor};font-weight:600;">${leadPct}</span> so với phiên liền trước, niêm yết ở mức <strong>${fmtVnd(lead.sell)} VNĐ/chỉ</strong> (giá bán ra). Mức chênh lệch mua – bán phản ánh thanh khoản thị trường vật chất và biên độ rủi ro mà doanh nghiệp kinh doanh vàng đang áp dụng trong ngày.`
    : `Dữ liệu giá vàng ngày ${escape(opts.dateLabel)} hiện chưa đầy đủ. Quý độc giả có thể truy cập MarketWatch để xem cập nhật theo thời gian thực.`;
  const html = shell(`Bản tin giá vàng • ${opts.dateLabel}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Nhật báo giá vàng</div>
    <h1 style="font-size:24px;margin:0 0 4px;color:#111;line-height:1.25;">Thị trường vàng ${escape(opts.dateLabel)}</h1>
    <p style="margin:0 0 18px;color:#888;font-size:12px;letter-spacing:0.04em;">Bản tin nội bộ MarketWatch · Cập nhật vào lúc bản tin được phát hành</p>

    <h2 style="font-size:14px;margin:18px 0 8px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Tóm tắt phiên</h2>
    <p style="margin:0 0 16px;line-height:1.7;color:#333;font-size:14px;">${summary}</p>

    <h2 style="font-size:14px;margin:22px 0 10px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Bảng giá tham chiếu</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#fafafa;">
        <th align="left" style="padding:11px 12px;color:#666;font-weight:600;">Sản phẩm</th>
        <th align="right" style="padding:11px 12px;color:#666;font-weight:600;">Mua vào</th>
        <th align="right" style="padding:11px 12px;color:#666;font-weight:600;">Bán ra</th>
        <th align="right" style="padding:11px 12px;color:#666;font-weight:600;">Biến động 24h</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:8px 0 0;color:#999;font-size:11px;line-height:1.6;">Đơn vị: VNĐ/chỉ đối với vàng miếng trong nước (1 lượng = 10 chỉ); USD/oz đối với XAU quốc tế. Tỷ giá quy đổi tham chiếu USD/VND của ngày phát hành.</p>

    <h2 style="font-size:14px;margin:26px 0 8px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Bối cảnh thị trường</h2>
    <p style="margin:0 0 12px;line-height:1.7;color:#333;font-size:14px;">Giá vàng trong nước thường phản ánh đồng thời ba yếu tố chính: diễn biến của vàng quốc tế (XAU/USD), tỷ giá USD/VND và chênh lệch cung – cầu của thị trường vật chất Việt Nam. Khi một trong các yếu tố này dịch chuyển mạnh, giá niêm yết của các thương hiệu lớn (SJC, DOJI, PNJ) có thể giãn rộng biên độ mua – bán nhằm quản trị rủi ro tồn kho.</p>
    <p style="margin:0 0 16px;line-height:1.7;color:#333;font-size:14px;">Nhà đầu tư được khuyến nghị theo dõi đồng thời chỉ số DXY, lợi suất trái phiếu kho bạc Hoa Kỳ kỳ hạn 10 năm và động thái của các ngân hàng trung ương lớn để có khung tham chiếu đầy đủ trước khi ra quyết định.</p>

    ${button(SITE + "/gia-vang", "Xem biểu đồ và lịch sử giá")}

    <p style="margin:20px 0 0;padding:14px 16px;background:#fafafa;border-left:3px solid ${GOLD};color:#555;font-size:12px;line-height:1.7;">
      <strong style="color:#333;">Nguồn dữ liệu &amp; phương pháp:</strong> Giá tham chiếu được tổng hợp tự động từ các nguồn niêm yết công khai của các doanh nghiệp kinh doanh vàng, dữ liệu thị trường quốc tế (XAU/USD) và tỷ giá USD/VND tại thời điểm phát hành. Số liệu mang tính tham khảo, không phản ánh giá giao dịch tức thời tại quầy.
    </p>
    <p style="margin:10px 0 0;color:#999;font-size:11px;line-height:1.6;">
      <strong style="color:#777;">Lưu ý:</strong> Bản tin này không phải là khuyến nghị đầu tư, chào bán hoặc tư vấn tài chính cá nhân. Quý độc giả tự chịu trách nhiệm về các quyết định giao dịch của mình.
    </p>
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
  const ranked = [...opts.rows].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const topGain = [...opts.rows].sort((a, b) => b.changePct - a.changePct)[0];
  const topLoss = [...opts.rows].sort((a, b) => a.changePct - b.changePct)[0];
  const avg = opts.rows.length ? opts.rows.reduce((s, r) => s + r.changePct, 0) / opts.rows.length : 0;
  const breadthUp = opts.rows.filter((r) => r.changePct > 0).length;
  const breadthDn = opts.rows.filter((r) => r.changePct < 0).length;
  const sentiment = avg > 1 ? "tích cực" : avg < -1 ? "tiêu cực" : "trung tính";
  const sentimentColor = avg > 1 ? "#0a8f4a" : avg < -1 ? "#c8312f" : "#666";
  const summary = opts.rows.length
    ? `Phiên ngày ${escape(opts.dateLabel)} ghi nhận tâm lý thị trường <strong style="color:${sentimentColor};">${sentiment}</strong> với mức thay đổi trung bình <strong>${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%</strong> trên rổ vốn hoá lớn. Trong số ${opts.rows.length} đồng được theo dõi, có ${breadthUp} mã tăng giá và ${breadthDn} mã giảm giá, phản ánh sự phân hoá tiếp tục diễn ra giữa các nhóm tài sản số.`
    : `Dữ liệu thị trường tiền điện tử ngày ${escape(opts.dateLabel)} hiện chưa được cập nhật. Vui lòng truy cập MarketWatch để xem bảng giá thời gian thực.`;
  const highlights = topGain && topLoss && topGain.symbol !== topLoss.symbol
    ? `<p style="margin:0 0 14px;line-height:1.7;color:#333;font-size:14px;">Đáng chú ý, <strong>${escape(topGain.symbol.toUpperCase())}</strong>${topGain.name ? ` (${escape(topGain.name)})` : ""} dẫn đầu nhịp tăng với mức <strong style="color:#0a8f4a;">+${topGain.changePct.toFixed(2)}%</strong>, trong khi <strong>${escape(topLoss.symbol.toUpperCase())}</strong>${topLoss.name ? ` (${escape(topLoss.name)})` : ""} là mã điều chỉnh sâu nhất ở mức <strong style="color:#c8312f;">${topLoss.changePct.toFixed(2)}%</strong>. Mức độ biến động chênh lệch giữa hai cực này cho thấy dòng tiền đang luân chuyển có chọn lọc, thay vì xu hướng đồng pha trên toàn rổ.</p>`
    : "";
  const html = shell(`Bản tin Crypto • ${opts.dateLabel}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Nhật báo tiền điện tử</div>
    <h1 style="font-size:24px;margin:0 0 4px;color:#111;line-height:1.25;">Thị trường Crypto ${escape(opts.dateLabel)}</h1>
    <p style="margin:0 0 18px;color:#888;font-size:12px;letter-spacing:0.04em;">Bản tin nội bộ MarketWatch · Dữ liệu USD theo phiên gần nhất</p>

    <h2 style="font-size:14px;margin:18px 0 8px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Tóm tắt phiên</h2>
    <p style="margin:0 0 12px;line-height:1.7;color:#333;font-size:14px;">${summary}</p>
    ${highlights}

    <h2 style="font-size:14px;margin:22px 0 10px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Top biến động theo vốn hoá</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#fafafa;">
        <th align="left" style="padding:11px 12px;color:#666;font-weight:600;">Tài sản</th>
        <th align="right" style="padding:11px 12px;color:#666;font-weight:600;">Giá tham chiếu (USD)</th>
        <th align="right" style="padding:11px 12px;color:#666;font-weight:600;">Biến động 24h</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <h2 style="font-size:14px;margin:26px 0 8px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Bối cảnh thị trường</h2>
    <p style="margin:0 0 12px;line-height:1.7;color:#333;font-size:14px;">Thị trường tài sản số tiếp tục vận động theo bốn nhóm tín hiệu chủ đạo: (i) chính sách lãi suất và thanh khoản toàn cầu, (ii) dòng vốn vào – ra các quỹ ETF Bitcoin và Ethereum giao ngay, (iii) hoạt động on-chain của các địa chỉ lớn (whales) cùng dòng tiền sàn giao dịch, và (iv) các sự kiện cấu trúc của giao thức (halving, nâng cấp, mở khoá token).</p>
    <p style="margin:0 0 16px;line-height:1.7;color:#333;font-size:14px;">Trong các giai đoạn biến động cao, mức chênh lệch giá giữa các sàn có thể giãn rộng đáng kể; nhà đầu tư cần lưu ý phí giao dịch, trượt giá (slippage) và rủi ro thanh khoản khi vào – thoát vị thế lớn.</p>

    ${button(SITE + "/tien-dien-tu", "Mở bảng giá Crypto thời gian thực")}

    <p style="margin:20px 0 0;padding:14px 16px;background:#fafafa;border-left:3px solid ${GOLD};color:#555;font-size:12px;line-height:1.7;">
      <strong style="color:#333;">Nguồn dữ liệu &amp; phương pháp:</strong> Giá và biến động 24 giờ được tổng hợp từ các API thị trường công khai (CoinGecko), tham chiếu theo vốn hoá thị trường tại thời điểm phát hành bản tin. Tổng số mã được khảo sát: <strong>${opts.rows.length}</strong>.
    </p>
    <p style="margin:10px 0 0;color:#999;font-size:11px;line-height:1.6;">
      <strong style="color:#777;">Miễn trừ trách nhiệm:</strong> Nội dung bản tin chỉ nhằm mục đích cung cấp thông tin tham khảo, không cấu thành lời khuyên đầu tư, mua – bán hoặc nắm giữ bất kỳ tài sản số nào. Tài sản số có biên độ biến động cao và tiềm ẩn rủi ro mất toàn bộ vốn.
    </p>
  `, { unsubUrl: opts.unsubUrl, manageUrl: opts.manageUrl ?? `${SITE}/cai-dat/ban-tin`, unsubLabel: "bản tin crypto" });
  void ranked;
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
  const usd = opts.rows.find((r) => r.pair.toUpperCase().startsWith("USD"));
  const usdCh = usd && typeof usd.changePct === "number" ? usd.changePct : null;
  const usdDir = usdCh === null ? "đi ngang" : usdCh >= 0 ? "tăng" : "giảm";
  const usdColor = usdCh === null ? "#666" : usdCh >= 0 ? "#0a8f4a" : "#c8312f";
  const usdPct = usdCh === null ? "" : ` ${usdCh >= 0 ? "+" : ""}${usdCh.toFixed(2)}%`;
  const summary = usd
    ? `Phiên ngày ${escape(opts.dateLabel)} ghi nhận tỷ giá <strong>USD/VND</strong> ${usdDir}<span style="color:${usdColor};font-weight:600;">${usdPct}</span>, niêm yết quanh mức <strong>${fmt(usd.rate)} VNĐ</strong>. Biến động của cặp tỷ giá chủ chốt này tiếp tục là tham chiếu quan trọng cho hoạt động xuất nhập khẩu, thanh toán quốc tế và quản trị dòng tiền ngoại tệ của doanh nghiệp.`
    : `Dữ liệu tỷ giá ngày ${escape(opts.dateLabel)} hiện chưa đầy đủ. Vui lòng truy cập MarketWatch để xem cập nhật mới nhất.`;
  const html = shell(`Tỷ giá ngoại tệ • ${opts.dateLabel}`, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Nhật báo ngoại tệ</div>
    <h1 style="font-size:24px;margin:0 0 4px;color:#111;line-height:1.25;">Tỷ giá ngoại tệ ${escape(opts.dateLabel)}</h1>
    <p style="margin:0 0 18px;color:#888;font-size:12px;letter-spacing:0.04em;">Bản tin nội bộ MarketWatch · Tỷ giá tham chiếu liên ngân hàng</p>

    <h2 style="font-size:14px;margin:18px 0 8px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Tóm tắt phiên</h2>
    <p style="margin:0 0 16px;line-height:1.7;color:#333;font-size:14px;">${summary}</p>

    <h2 style="font-size:14px;margin:22px 0 10px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Bảng tỷ giá tham chiếu</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#fafafa;">
        <th align="left" style="padding:11px 12px;color:#666;font-weight:600;">Cặp tỷ giá</th>
        <th align="right" style="padding:11px 12px;color:#666;font-weight:600;">Mức niêm yết</th>
        <th align="right" style="padding:11px 12px;color:#666;font-weight:600;">Biến động 24h</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:8px 0 0;color:#999;font-size:11px;line-height:1.6;">Đơn vị: VNĐ cho 1 đơn vị ngoại tệ cơ sở. Số liệu mang tính tham khảo và có thể chênh lệch so với tỷ giá niêm yết tại từng ngân hàng thương mại.</p>

    <h2 style="font-size:14px;margin:26px 0 8px;color:#111;text-transform:uppercase;letter-spacing:0.08em;">Bối cảnh thị trường</h2>
    <p style="margin:0 0 12px;line-height:1.7;color:#333;font-size:14px;">Diễn biến tỷ giá USD/VND chịu ảnh hưởng đồng thời từ ba nhóm yếu tố: (i) chính sách điều hành tỷ giá trung tâm của Ngân hàng Nhà nước Việt Nam và biên độ ± 5%, (ii) sức mạnh đồng USD trên thị trường quốc tế thể hiện qua chỉ số DXY, và (iii) cán cân thanh toán – cung cầu ngoại tệ thực tế từ hoạt động xuất nhập khẩu, kiều hối và đầu tư trực tiếp nước ngoài (FDI).</p>
    <p style="margin:0 0 16px;line-height:1.7;color:#333;font-size:14px;">Đối với các đồng tiền chéo như EUR, JPY, GBP, CNY, biến động phản ánh tương quan của đồng VND so với USD cộng với chênh lệch tỷ giá của từng cặp ngoại tệ chủ chốt trên thị trường toàn cầu.</p>

    ${button(SITE + "/ty-gia-ngoai-te", "Xem chi tiết tỷ giá &amp; lịch sử")}

    <p style="margin:20px 0 0;padding:14px 16px;background:#fafafa;border-left:3px solid ${GOLD};color:#555;font-size:12px;line-height:1.7;">
      <strong style="color:#333;">Nguồn dữ liệu &amp; phương pháp:</strong> Tỷ giá tham chiếu được tổng hợp tự động từ dữ liệu thị trường quốc tế và các nguồn niêm yết công khai tại thời điểm phát hành. Bản tin không thay thế tỷ giá giao dịch chính thức tại các tổ chức tín dụng.
    </p>
    <p style="margin:10px 0 0;color:#999;font-size:11px;line-height:1.6;">
      <strong style="color:#777;">Miễn trừ trách nhiệm:</strong> Thông tin trong bản tin chỉ phục vụ mục đích tham khảo. MarketWatch không cung cấp dịch vụ đổi tiền, không khuyến nghị giao dịch ngoại hối và không chịu trách nhiệm về các quyết định tài chính phát sinh từ việc sử dụng dữ liệu này.
    </p>
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

// ---------- Kết quả kháng nghị tài khoản bị cấm ----------
export function banAppealDecisionEmail(opts: {
  approved: boolean;
  email: string;
  reason: string;
  adminNote?: string | null;
  appealId: string;
  submittedAt: string | Date;
  decidedAt: string | Date;
}) {
  const title = opts.approved
    ? "Kháng nghị được chấp nhận — tài khoản đã mở khoá"
    : "Kháng nghị bị từ chối";
  const intro = opts.approved
    ? "Chúng tôi đã xem xét kháng nghị của bạn và quyết định mở khoá tài khoản. Bạn có thể đăng nhập lại ngay bây giờ."
    : "Chúng tôi đã xem xét kháng nghị của bạn và quyết định giữ nguyên trạng thái khoá tài khoản. Theo chính sách, mỗi tài khoản chỉ được kháng nghị một lần.";
  const noteBlock = opts.adminNote
    ? `<div style="margin:14px 0;padding:12px 14px;border-left:3px solid ${GOLD};background:#fafafa;color:#444;font-size:13px;line-height:1.6;white-space:pre-wrap;"><strong style="color:#222;">Phản hồi từ đội ngũ:</strong><br/>${escape(opts.adminNote)}</div>`
    : "";
  const reasonBlock = `<div style="margin:14px 0;padding:12px 14px;border:1px solid #ececec;border-radius:6px;background:#fff;color:#555;font-size:13px;line-height:1.6;white-space:pre-wrap;"><strong style="color:#222;">Nội dung kháng nghị của bạn:</strong><br/>${escape(opts.reason)}</div>`;
  const fmt = (d: string | Date) =>
    new Date(d).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    }) + " (giờ VN)";
  // Mã tham chiếu ngắn, dễ đọc — 8 ký tự đầu của UUID, viết hoa.
  const refCode = `APL-${opts.appealId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const metaBlock = `
    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:14px 0;border:1px solid #ececec;border-radius:6px;background:#fafafa;font-size:13px;line-height:1.6;">
      <tbody>
        <tr><td style="padding:8px 14px;color:#888;width:40%;">Mã tham chiếu</td><td style="padding:8px 14px;color:#111;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;">${refCode}</td></tr>
        <tr><td style="padding:8px 14px;color:#888;border-top:1px solid #ececec;">Email tài khoản</td><td style="padding:8px 14px;color:#333;border-top:1px solid #ececec;">${escape(opts.email)}</td></tr>
        <tr><td style="padding:8px 14px;color:#888;border-top:1px solid #ececec;">Thời điểm gửi đơn</td><td style="padding:8px 14px;color:#333;border-top:1px solid #ececec;">${escape(fmt(opts.submittedAt))}</td></tr>
        <tr><td style="padding:8px 14px;color:#888;border-top:1px solid #ececec;">Thời điểm quyết định</td><td style="padding:8px 14px;color:#333;border-top:1px solid #ececec;">${escape(fmt(opts.decidedAt))}</td></tr>
        <tr><td style="padding:8px 14px;color:#888;border-top:1px solid #ececec;">Kết quả</td><td style="padding:8px 14px;border-top:1px solid #ececec;font-weight:700;color:${opts.approved ? "#15803d" : "#b91c1c"};">${opts.approved ? "Được chấp nhận" : "Bị từ chối"}</td></tr>
      </tbody>
    </table>`;
  const nextSteps = opts.approved
    ? `
      <div style="margin:18px 0 8px;font-size:13px;color:#222;font-weight:700;">Bước tiếp theo</div>
      <ol style="margin:0 0 14px 18px;padding:0;color:#333;font-size:13px;line-height:1.7;">
        <li>Bấm nút <strong>Đăng nhập lại</strong> bên dưới và sử dụng đúng email/mật khẩu cũ.</li>
        <li>Kiểm tra lại cài đặt bảo mật (2FA, thiết bị tin cậy) tại <a href="${SITE}/cai-dat/bao-mat" style="color:#555;">Cài đặt bảo mật</a>.</li>
        <li>Tuân thủ <a href="${SITE}/dieu-khoan-su-dung" style="color:#555;">Điều khoản sử dụng</a> để tránh bị khoá lại — lần khoá sau có thể vĩnh viễn.</li>
      </ol>
      ${button(SITE + "/dang-nhap", "Đăng nhập lại")}
    `
    : `
      <div style="margin:18px 0 8px;font-size:13px;color:#222;font-weight:700;">Bước tiếp theo</div>
      <ul style="margin:0 0 14px 18px;padding:0;color:#333;font-size:13px;line-height:1.7;">
        <li>Quyết định này là <strong>chung thẩm</strong>: mỗi tài khoản chỉ được kháng nghị một lần.</li>
        <li>Nếu bạn cho rằng có nhầm lẫn nghiêm trọng (sai danh tính, lỗi hệ thống, dữ liệu bị giả mạo), hãy phản hồi email này hoặc viết tới <a href="mailto:contact@marketwatch.vn?subject=${encodeURIComponent("Phản hồi quyết định " + refCode)}" style="color:#555;">contact@marketwatch.vn</a> kèm <strong>mã tham chiếu ${refCode}</strong>.</li>
        <li>Vui lòng không tạo tài khoản mới để né tránh lệnh khoá — điều này vi phạm <a href="${SITE}/dieu-khoan-su-dung" style="color:#555;">Điều khoản sử dụng</a>.</li>
      </ul>
    `;
  const html = shell(title, `
    <div style="font-size:12px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Kết quả kháng nghị · ${refCode}</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#111;">${escape(title)}</h1>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">Xin chào <strong>${escape(opts.email)}</strong>,</p>
    <p style="margin:0 0 12px;line-height:1.6;color:#333;">${intro}</p>
    ${metaBlock}
    ${noteBlock}
    ${reasonBlock}
    ${nextSteps}
  `);
  return { subject: `[MarketWatch] ${title} · ${refCode}`, html };
}