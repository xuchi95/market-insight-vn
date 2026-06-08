import { sendEmail } from "./resend.server";

const SITE = "https://marketwatch.vn";
const GOLD = "#C9A24A";

export type DigestTopic = "gold" | "btc" | "usd";

export interface DigestSeries {
  topic: DigestTopic;
  label: string;
  unit: string;
  current: number;
  previous: number;
  changePct: number;
  changeAbs: number;
  series: number[]; // 7+ daily points, oldest → newest
  series30?: number[];
  high7: number;
  low7: number;
  high30: number;
  low30: number;
  changePct30: number;
}

// ---------------- Data fetchers ----------------

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

async function fetchBtcSeries(): Promise<DigestSeries | null> {
  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("days", "30");
    url.searchParams.set("interval", "daily");
    const headers: Record<string, string> = { accept: "application/json" };
    const key = process.env.COINGECKO_API_KEY;
    if (key) headers["x-cg-demo-api-key"] = key;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const json: any = await res.json();
    const prices: [number, number][] = json?.prices ?? [];
    const series = prices.map((p) => Number(p[1])).filter(isFiniteNum);
    if (series.length < 2) return null;
    return buildSeries("btc", "Bitcoin (BTC)", "USD", series);
  } catch (e) {
    console.error("digest: btc fetch failed", e);
    return null;
  }
}

async function fetchFmpHistorical(symbol: string): Promise<number[] | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const url = new URL(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}`);
    url.searchParams.set("timeseries", "35");
    url.searchParams.set("apikey", key);
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const json: any = await res.json();
    const hist: any[] = json?.historical ?? [];
    const pts = hist
      .map((h) => Number(h?.close))
      .filter(isFiniteNum)
      .reverse(); // FMP returns newest first
    return pts.length >= 2 ? pts.slice(-30) : null;
  } catch (e) {
    console.error("digest: fmp fetch failed", symbol, e);
    return null;
  }
}

async function fetchGoldSeries(): Promise<DigestSeries | null> {
  const pts = await fetchFmpHistorical("XAUUSD");
  if (!pts) return null;
  return buildSeries("gold", "Vàng (XAU/USD)", "USD/oz", pts);
}

async function fetchUsdVndSeries(): Promise<DigestSeries | null> {
  const pts = await fetchFmpHistorical("USDVND");
  if (!pts) return null;
  return buildSeries("usd", "Tỷ giá USD/VND", "VND", pts);
}

function buildSeries(topic: DigestTopic, label: string, unit: string, full: number[]): DigestSeries {
  const series30 = full.slice(-30);
  const series = full.slice(-8);
  const current = series[series.length - 1];
  const previous = series[0];
  const changeAbs = current - previous;
  const changePct = previous !== 0 ? (changeAbs / previous) * 100 : 0;
  const first30 = series30[0];
  const changePct30 = first30 ? ((current - first30) / first30) * 100 : 0;
  return {
    topic, label, unit, current, previous, changePct, changeAbs, series, series30,
    high7: Math.max(...series),
    low7: Math.min(...series),
    high30: Math.max(...series30),
    low30: Math.min(...series30),
    changePct30,
  };
}

export async function fetchDigestData(topics: DigestTopic[]): Promise<DigestSeries[]> {
  const wanted = new Set(topics);
  const tasks: Promise<DigestSeries | null>[] = [];
  if (wanted.has("gold")) tasks.push(fetchGoldSeries());
  if (wanted.has("btc")) tasks.push(fetchBtcSeries());
  if (wanted.has("usd")) tasks.push(fetchUsdVndSeries());
  const out = await Promise.all(tasks);
  return out.filter((x): x is DigestSeries => x !== null);
}

// ---------------- Rendering ----------------

function fmtVal(s: DigestSeries): string {
  if (s.topic === "usd") return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(s.current) + " ₫";
  const max = s.current < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: max }).format(s.current);
}

function fmtRaw(s: DigestSeries, n: number): string {
  if (s.topic === "usd") return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + " ₫";
  const max = n < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: max }).format(n);
}

function fmtPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

function sparkline(series: number[], color: string, w = 520, h = 110): string {
  if (series.length < 2) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = w / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = (i * stepX).toFixed(1);
    const y = (h - ((v - min) / range) * (h - 8) - 4).toFixed(1);
    return `${x},${y}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const area = `M 0,${h} L ${pts.join(" L ")} L ${w},${h} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;width:100%;">
    <path d="${area}" fill="${color}" fill-opacity="0.12"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function shell(title: string, inner: string, unsubUrl: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #ececec;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;">
          <span style="color:${GOLD};">Market</span><span style="color:#111111;">Watch</span>
        </div>
        <div style="font-size:12px;color:#888;letter-spacing:0.12em;text-transform:uppercase;margin-top:4px;">Bản tin tuần · Tổng hợp biến động</div>
      </td></tr>
      <tr><td style="padding:24px 28px;">${inner}</td></tr>
      <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #f0f0f0;font-size:12px;color:#888;line-height:1.6;">
        Bạn nhận email này vì đã đăng ký bản tin MarketWatch.<br/>
        <a href="${SITE}/cai-dat/ban-tin" style="color:#555;">Tuỳ chỉnh chủ đề</a> ·
        <a href="${unsubUrl}" style="color:#555;">Huỷ đăng ký</a> ·
        <a href="${SITE}" style="color:#555;">marketwatch.vn</a><br/>
        © ${new Date().getFullYear()} MarketWatch — Dữ liệu chỉ mang tính tham khảo.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const TOPIC_LINK: Record<DigestTopic, { path: string; cta: string }> = {
  gold: { path: "/gia-vang", cta: "Xem giá vàng chi tiết" },
  btc: { path: "/tien-dien-tu", cta: "Xem thị trường crypto" },
  usd: { path: "/ty-gia-ngan-hang", cta: "Xem tỷ giá ngân hàng" },
};

function commentary(s: DigestSeries): string {
  const dir = s.changePct >= 0 ? "tăng" : "giảm";
  const mag = Math.abs(s.changePct);
  const strength = mag >= 5 ? "mạnh" : mag >= 2 ? "rõ rệt" : mag >= 0.5 ? "nhẹ" : "đi ngang";
  const range7 = s.high7 - s.low7;
  const volPct = s.previous ? (range7 / s.previous) * 100 : 0;
  const volWord = volPct >= 6 ? "biên độ rất rộng" : volPct >= 3 ? "biên độ rộng" : volPct >= 1 ? "biên độ vừa phải" : "biên độ hẹp";
  const trend30 = s.changePct30 >= 0 ? "duy trì xu hướng tăng" : "vẫn trong xu hướng giảm";
  const trend30Strength = Math.abs(s.changePct30) >= 8 ? " đáng chú ý" : "";
  switch (s.topic) {
    case "btc":
      return `Bitcoin ${dir} ${strength} trong 7 ngày (${fmtPct(s.changePct)}), dao động ${volWord} từ ${fmtRaw(s, s.low7)} đến ${fmtRaw(s, s.high7)}. Tính trong 30 ngày, BTC ${trend30}${trend30Strength} (${fmtPct(s.changePct30)}). Tâm lý nhà đầu tư crypto thường nhạy với lãi suất Fed, dữ liệu CPI Mỹ và dòng vốn ETF.`;
    case "gold":
      return `Giá vàng thế giới ${dir} ${strength} ${fmtPct(s.changePct)} trong tuần, ${volWord} (${fmtRaw(s, s.low7)} – ${fmtRaw(s, s.high7)}). Trong 30 ngày, XAU/USD ${trend30}${trend30Strength} (${fmtPct(s.changePct30)}). Diễn biến chịu ảnh hưởng bởi kỳ vọng lãi suất, sức mạnh đồng USD (DXY) và nhu cầu trú ẩn an toàn.`;
    case "usd":
      return `Tỷ giá USD/VND ${dir} ${strength} ${fmtPct(s.changePct)} trong 7 ngày, dao động từ ${fmtRaw(s, s.low7)} đến ${fmtRaw(s, s.high7)}. Trong 30 ngày tỷ giá ${trend30}${trend30Strength} (${fmtPct(s.changePct30)}). Áp lực chính đến từ DXY, chênh lệch lãi suất USD-VND và cán cân thanh toán; NHNN điều hành qua tỷ giá trung tâm và biên độ ±5%.`;
  }
}

function statRow(label: string, value: string, color = "#111"): string {
  return `<tr>
    <td style="padding:6px 0;color:#888;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">${escape(label)}</td>
    <td style="padding:6px 0;color:${color};font-size:14px;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}

function marketOverview(series: DigestSeries[]): string {
  if (!series.length) return "";
  const parts = series.map((s) => {
    const dir = s.changePct >= 0 ? "tăng" : "giảm";
    const color = s.changePct >= 0 ? "#0a8f4a" : "#c8312f";
    return `<strong>${escape(s.label.split(" ")[0])}</strong> <span style="color:${color};font-weight:600;">${dir} ${fmtPct(s.changePct)}</span>`;
  });
  const upCount = series.filter((s) => s.changePct >= 0).length;
  const mood = upCount === series.length
    ? "Tuần qua các chủ đề bạn theo dõi đồng loạt phục hồi"
    : upCount === 0
    ? "Tuần qua các chủ đề bạn theo dõi đồng loạt chịu áp lực điều chỉnh"
    : "Tuần qua thị trường phân hoá giữa các chủ đề bạn theo dõi";
  return `<div style="margin:0 0 18px;padding:16px 18px;background:#fbf8ef;border:1px solid #efe4c2;border-radius:10px;color:#3a3017;font-size:14px;line-height:1.7;">
    <div style="font-size:11px;color:${GOLD};letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;font-weight:700;">Tổng quan tuần</div>
    ${mood}: ${parts.join(", ")}. Phía dưới là chi tiết từng tài sản gồm vùng giá, đỉnh – đáy 7 ngày, xu hướng 30 ngày và bình luận ngắn.
  </div>`;
}

function topicCard(s: DigestSeries): string {
  const up = s.changePct >= 0;
  const color = up ? "#16a34a" : "#dc2626";
  const color30 = s.changePct30 >= 0 ? "#16a34a" : "#dc2626";
  const arrow = up ? "▲" : "▼";
  const link = TOPIC_LINK[s.topic];
  const distFromHigh = s.high7 ? ((s.current - s.high7) / s.high7) * 100 : 0;
  const absStr = (s.changeAbs >= 0 ? "+" : "−") + fmtRaw(s, Math.abs(s.changeAbs)).replace(/^[+-]/, "");
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;border:1px solid #ececec;border-radius:12px;overflow:hidden;background:#ffffff;">
    <tr><td style="padding:18px 20px 4px;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;">${escape(s.label)}</div>
      <div style="font-size:30px;font-weight:700;color:#111;line-height:1.2;margin:6px 0 4px;letter-spacing:-0.01em;">${fmtVal(s)}</div>
      <div style="font-size:14px;color:${color};font-weight:600;">${arrow} ${fmtPct(s.changePct)} <span style="color:#999;font-weight:400;">(${absStr} trong 7 ngày)</span></div>
    </td></tr>
    <tr><td style="padding:10px 20px 6px;">
      ${sparkline(s.series30 ?? s.series, color)}
      <div style="font-size:11px;color:#aaa;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">Diễn biến 30 ngày gần nhất</div>
    </td></tr>
    <tr><td style="padding:8px 20px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${statRow("Đỉnh 7 ngày", fmtRaw(s, s.high7))}
        ${statRow("Đáy 7 ngày", fmtRaw(s, s.low7))}
        ${statRow("So với đỉnh 7N", fmtPct(distFromHigh), distFromHigh >= 0 ? "#0a8f4a" : "#c8312f")}
        ${statRow("Thay đổi 30 ngày", fmtPct(s.changePct30), color30)}
        ${statRow("Đỉnh – đáy 30N", `${fmtRaw(s, s.low30)} – ${fmtRaw(s, s.high30)}`)}
      </table>
    </td></tr>
    <tr><td style="padding:0 20px 18px;">
      <p style="margin:0 0 12px;font-size:13px;color:#444;line-height:1.65;">${commentary(s)}</p>
      <a href="${SITE}${link.path}" style="display:inline-block;font-size:13px;color:#111;text-decoration:none;border:1px solid #d8d8d8;border-radius:8px;padding:8px 14px;font-weight:600;">${escape(link.cta)} →</a>
    </td></tr>
  </table>`;
}

function weekAheadBlock(topics: Set<DigestTopic>): string {
  const items: { title: string; desc: string; href: string; show: boolean }[] = [
    {
      title: "Lịch sự kiện kinh tế tuần",
      desc: "Theo dõi CPI Mỹ, biên bản FOMC, dữ liệu PMI và các phát biểu của quan chức Fed có thể tác động mạnh tới vàng và crypto.",
      href: `${SITE}/lich-kinh-te`,
      show: true, // luôn liên quan
    },
    {
      title: "Lãi suất tiết kiệm ngân hàng",
      desc: "So sánh biểu lãi suất mới nhất tại các ngân hàng để cân nhắc kênh giữ tiền VND.",
      href: `${SITE}/lai-suat-tiet-kiem`,
      show: topics.has("usd"),
    },
    {
      title: "Vĩ mô Việt Nam",
      desc: "Cập nhật CPI, GDP, FDI, dự trữ ngoại hối và lãi suất điều hành của NHNN.",
      href: `${SITE}/vi-mo-viet-nam`,
      show: topics.has("usd") || topics.has("gold"),
    },
    {
      title: "Giá vàng SJC – PNJ – DOJI",
      desc: "Theo dõi chênh lệch mua – bán và biến động trong ngày của các thương hiệu vàng lớn trong nước.",
      href: `${SITE}/gia-vang`,
      show: topics.has("gold"),
    },
    {
      title: "Thị trường tiền điện tử",
      desc: "Top coin theo vốn hoá, biến động 24h và dòng vốn ETF Bitcoin mới nhất.",
      href: `${SITE}/tien-dien-tu`,
      show: topics.has("btc"),
    },
  ].filter((x) => x.show);
  if (items.length === 0) return "";
  const rows = items.map((it) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
      <a href="${it.href}" style="font-size:14px;font-weight:600;color:#111;text-decoration:none;">${escape(it.title)} →</a>
      <div style="font-size:13px;color:#666;line-height:1.6;margin-top:2px;">${escape(it.desc)}</div>
    </td></tr>`).join("");
  return `<div style="margin:8px 0 4px;">
    <h2 style="font-size:16px;color:#111;margin:0 0 8px;letter-spacing:-0.005em;">Tuần tới chú ý gì</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #f0f0f0;">${rows}</table>
  </div>`;
}

function toolsBlock(topics: Set<DigestTopic>): string {
  const tools: { label: string; href: string; show: boolean }[] = [
    { label: "Tính lãi suất tiết kiệm", href: `${SITE}/tinh-lai-suat-tiet-kiem`, show: topics.has("usd") },
    { label: "Mô phỏng DCA crypto", href: `${SITE}/cong-cu/dca-roi`, show: topics.has("btc") },
    { label: "Quy đổi tiền tệ", href: `${SITE}/quy-doi-tien-te`, show: topics.has("usd") || topics.has("gold") },
    { label: "Tỷ giá ngân hàng", href: `${SITE}/ty-gia-ngan-hang`, show: topics.has("usd") },
    { label: "Giá vàng SJC", href: `${SITE}/gia-vang`, show: topics.has("gold") },
    { label: "Bitcoin & altcoin", href: `${SITE}/tien-dien-tu`, show: topics.has("btc") },
  ].filter((t) => t.show);
  if (tools.length === 0) return "";
  const cells = tools.map((t) =>
    `<a href="${t.href}" style="display:inline-block;margin:4px 6px 4px 0;padding:8px 12px;border:1px solid #ececec;border-radius:999px;font-size:12px;color:#444;text-decoration:none;background:#fafafa;">${escape(t.label)}</a>`,
  ).join("");
  return `<div style="margin:20px 0 0;padding-top:16px;border-top:1px solid #f0f0f0;">
    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;font-weight:700;">Công cụ liên quan cho bạn</div>
    ${cells}
  </div>`;
}

export function buildDigestEmail(opts: {
  series: DigestSeries[];
  unsubUrl: string;
}): { subject: string; html: string } {
  const week = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const headline = opts.series
    .map((s) => `${s.label.split(" ")[0]} ${fmtPct(s.changePct)}`)
    .join(" · ");
  const cards = opts.series.map(topicCard).join("");
  const topicSet = new Set<DigestTopic>(opts.series.map((s) => s.topic));
  const topicSummary = opts.series.length
    ? opts.series.map((s) => s.label.split(" ")[0]).join(", ")
    : "các chủ đề bạn chọn";
  const inner = `
    <h1 style="font-size:24px;margin:0 0 6px;color:#111;line-height:1.3;letter-spacing:-0.01em;">Bản tin tuần ${escape(week)}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.65;">Bản tin này được cá nhân hoá theo chủ đề bạn đã chọn: <strong style="color:#111;">${escape(topicSummary)}</strong>. Gồm biến động 7 ngày, xu hướng 30 ngày, vùng giá đỉnh – đáy và bình luận ngắn cho từng tài sản.</p>
    ${marketOverview(opts.series)}
    ${cards.length ? cards : '<p style="color:#666;font-size:14px;">Chưa có dữ liệu cho các chủ đề bạn chọn. Vui lòng thử lại sau.</p>'}
    ${weekAheadBlock(topicSet)}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px 0 0;"><tr><td style="background:${GOLD};border-radius:8px;">
      <a href="${SITE}" style="display:inline-block;padding:12px 22px;color:#111;font-weight:600;text-decoration:none;font-size:14px;">Mở dashboard MarketWatch</a>
    </td></tr></table>
    ${toolsBlock(topicSet)}
    <p style="margin:18px 0 0;font-size:12px;color:#999;line-height:1.6;">Dữ liệu được tổng hợp tự động từ các nguồn công khai (CoinGecko, FMP, NHNN) tại thời điểm gửi và chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.</p>`;
  return {
    subject: `Bản tin tuần MarketWatch — ${headline || week}`,
    html: shell(`Bản tin tuần MarketWatch — ${week}`, inner, opts.unsubUrl),
  };
}

export async function sendDigestTo(opts: {
  email: string;
  unsubscribeToken: string;
  series: DigestSeries[];
}) {
  const unsubUrl = `${SITE}/huy-ban-tin?token=${encodeURIComponent(opts.unsubscribeToken)}`;
  const { subject, html } = buildDigestEmail({ series: opts.series, unsubUrl });
  return sendEmail({
    to: opts.email,
    subject,
    html,
    tags: ["newsletter-weekly-digest"],
    stream: "broadcast",
  });
}