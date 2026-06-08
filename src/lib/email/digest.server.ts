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

function fmtPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

function sparkline(series: number[], color: string, w = 220, h = 60): string {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;">
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

function topicCard(s: DigestSeries): string {
  const up = s.changePct >= 0;
  const color = up ? "#16a34a" : "#dc2626";
  const arrow = up ? "▲" : "▼";
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;border:1px solid #ececec;border-radius:10px;overflow:hidden;">
    <tr><td style="padding:16px 18px;">
      <div style="display:block;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">${escape(s.label)}</div>
      <table width="100%"><tr>
        <td style="vertical-align:middle;">
          <div style="font-size:22px;font-weight:700;color:#111;line-height:1.2;">${fmtVal(s)}</div>
          <div style="font-size:13px;color:${color};font-weight:600;margin-top:2px;">${arrow} ${fmtPct(s.changePct)} <span style="color:#999;font-weight:400;">trong 7 ngày</span></div>
        </td>
        <td align="right" style="vertical-align:middle;width:230px;">
          ${sparkline(s.series, color)}
        </td>
      </tr></table>
    </td></tr>
  </table>`;
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
  const inner = `
    <h1 style="font-size:22px;margin:0 0 4px;color:#111;line-height:1.3;">Bản tin tuần ${escape(week)}</h1>
    <p style="margin:0 0 18px;font-size:13px;color:#666;line-height:1.6;">Tổng hợp biến động 7 ngày các chủ đề bạn đang theo dõi.</p>
    ${cards.length ? cards : '<p style="color:#666;font-size:14px;">Chưa có dữ liệu cho các chủ đề bạn chọn. Vui lòng thử lại sau.</p>'}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 0;"><tr><td style="background:${GOLD};border-radius:8px;">
      <a href="${SITE}" style="display:inline-block;padding:12px 22px;color:#111;font-weight:600;text-decoration:none;font-size:14px;">Xem chi tiết trên MarketWatch</a>
    </td></tr></table>`;
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