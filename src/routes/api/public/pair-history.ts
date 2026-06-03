import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; payload: Payload }>();

interface P { t: number; v: number }
interface Payload { from: string; to: string; days: number; points: P[]; source: string }

// ---------- Forex via Yahoo Finance ----------
function yahooParams(days: number): { range: string; interval: string } {
  if (days <= 1) return { range: "1d", interval: "15m" };
  if (days <= 7) return { range: "7d", interval: "60m" };
  if (days <= 30) return { range: "1mo", interval: "1d" };
  return { range: "3mo", interval: "1d" };
}

async function yahooSeries(symbol: string, days: number): Promise<P[]> {
  const { range, interval } = yahooParams(days);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", accept: "application/json" } });
  if (!r.ok) throw new Error(`yahoo ${r.status}`);
  const j: any = await r.json();
  const res = j?.chart?.result?.[0];
  const ts: number[] = res?.timestamp ?? [];
  const closes: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
  const out: P[] = [];
  for (let i = 0; i < ts.length; i++) {
    const v = closes[i];
    if (v == null || !Number.isFinite(v)) continue;
    out.push({ t: ts[i] * 1000, v });
  }
  return out;
}

async function forexVndSeries(code: string, days: number): Promise<P[]> {
  if (code === "VND") {
    const now = Date.now();
    const n = days <= 1 ? 24 : Math.min(days * 4, 60);
    const span = days * 86400_000;
    return Array.from({ length: n + 1 }, (_, i) => ({ t: now - (span * (n - i)) / n, v: 1 }));
  }
  return yahooSeries(`${code}VND=X`, days);
}

// ---------- Crypto via CoinCap ----------
const COIN_ID_ALIAS: Record<string, string> = {
  binancecoin: "binance-coin",
  ripple: "xrp",
  "the-open-network": "toncoin",
  "avalanche-2": "avalanche",
};

function ccInterval(days: number): string {
  if (days <= 1) return "m15";
  if (days <= 7) return "h2";
  if (days <= 30) return "h6";
  return "d1";
}

let usdVndCache: { at: number; v: number } | null = null;
async function fetchUsdVnd(): Promise<number> {
  if (usdVndCache && Date.now() - usdVndCache.at < 10 * 60_000) return usdVndCache.v;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const j: any = await r.json();
    const v = Number(j?.rates?.VND);
    if (Number.isFinite(v) && v > 0) {
      usdVndCache = { at: Date.now(), v };
      return v;
    }
  } catch { /* ignore */ }
  return usdVndCache?.v ?? 25_400;
}

async function cryptoVndSeries(rawId: string, days: number): Promise<P[]> {
  const id = COIN_ID_ALIAS[rawId] || rawId;
  const end = Date.now();
  const start = end - days * 86400_000;
  const url = new URL(`https://rest.coincap.io/v3/assets/${id}/history`);
  url.searchParams.set("interval", ccInterval(days));
  url.searchParams.set("start", String(start));
  url.searchParams.set("end", String(end));
  const key = process.env.COINCAP_API_KEY;
  if (key) url.searchParams.set("apiKey", key);
  const [r, usdVnd] = await Promise.all([
    fetch(url.toString(), { headers: { accept: "application/json" } }),
    fetchUsdVnd(),
  ]);
  if (!r.ok) throw new Error(`coincap ${r.status}`);
  const j: any = await r.json();
  const arr: any[] = Array.isArray(j?.data) ? j.data : [];
  return arr
    .map((p) => ({ t: Number(p?.time), v: Number(p?.priceUsd) * usdVnd }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v) && p.v > 0);
}

// ---------- Gold via PNJ history ----------
function ymdVN(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 3600_000);
  return `${vn.getUTCFullYear()}${String(vn.getUTCMonth() + 1).padStart(2, "0")}${String(vn.getUTCDate()).padStart(2, "0")}`;
}
function parseVnNum(s: string): number {
  return parseFloat(String(s || "").replace(/\./g, "").replace(/,/g, ".")) || 0;
}
async function fetchPnjDay(ymd: string): Promise<any> {
  const r = await fetch(`https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price-history?date=${ymd}`, {
    headers: { accept: "application/json" },
  });
  if (!r.ok) throw new Error(`pnj ${r.status}`);
  return r.json();
}
function pickGoldType(loc: any, wantSJC: boolean): any | null {
  const types: any[] = loc?.gold_type ?? [];
  if (wantSJC) return types.find((g) => g.name === "SJC" && g.data?.length) ?? null;
  return types.find((g) => g.name !== "SJC" && g.data?.length) ?? null;
}
function pickLocation(j: any): any | null {
  const locs: any[] = j?.locations ?? [];
  return (
    locs.find((l) => l.name === "TPHCM" && l.gold_type?.some((g: any) => g.data?.length)) ??
    locs.find((l) => l.gold_type?.some((g: any) => g.data?.length)) ?? null
  );
}
async function goldVndSeries(goldId: string, days: number): Promise<P[]> {
  const wantSJC = goldId === "sjc-1l";
  const out: P[] = [];

  if (days <= 1) {
    for (let i = 0; i < 5; i++) {
      const ymd = ymdVN(new Date(Date.now() - i * 86400_000));
      try {
        const j = await fetchPnjDay(ymd);
        const loc = pickLocation(j);
        if (!loc) continue;
        const gt = pickGoldType(loc, wantSJC);
        if (!gt) continue;
        for (const p of gt.data) {
          const buy = parseVnNum(p.gia_mua);
          const sell = parseVnNum(p.gia_ban);
          if (!buy || !sell) continue;
          // PNJ history: ngàn VND / lượng → VND / chỉ
          const v = ((buy + sell) / 2) * 1000 / 10;
          const t = new Date(String(p.updated_at).replace(" ", "T") + "+07:00").getTime();
          if (Number.isFinite(t)) out.push({ t, v });
        }
        if (out.length) break;
      } catch { /* try previous day */ }
    }
  } else {
    const n = Math.min(days, 30);
    const dates = Array.from({ length: n + 1 }, (_, i) => ymdVN(new Date(Date.now() - (n - i) * 86400_000)));
    const results = await Promise.allSettled(dates.map((d) => fetchPnjDay(d).then((j) => ({ d, j }))));
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const { d, j } = r.value;
      const loc = pickLocation(j);
      if (!loc) continue;
      const gt = pickGoldType(loc, wantSJC);
      if (!gt) continue;
      const last = gt.data[gt.data.length - 1];
      const buy = parseVnNum(last.gia_mua);
      const sell = parseVnNum(last.gia_ban);
      if (!buy || !sell) continue;
      const v = ((buy + sell) / 2) * 1000 / 10;
      const t = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T16:00:00+07:00`).getTime();
      out.push({ t, v });
    }
    out.sort((a, b) => a.t - b.t);
  }
  return out;
}

// ---------- Dispatch by asset key ----------
async function vndSeries(key: string, days: number): Promise<{ points: P[]; source: string }> {
  if (key === "vnd") return { points: await forexVndSeries("VND", days), source: "constant" };
  if (key.startsWith("f:")) return { points: await forexVndSeries(key.slice(2).toUpperCase(), days), source: "Yahoo Finance" };
  if (key.startsWith("c:")) return { points: await cryptoVndSeries(key.slice(2), days), source: "CoinCap" };
  if (key.startsWith("g:")) return { points: await goldVndSeries(key.slice(2), days), source: "PNJ" };
  return { points: [], source: "unknown" };
}

// Forward-fill align two series on the union of timestamps.
function combine(from: P[], to: P[]): P[] {
  if (!from.length || !to.length) return [];
  const ts = Array.from(new Set([...from.map((p) => p.t), ...to.map((p) => p.t)])).sort((a, b) => a - b);
  const ff = (arr: P[]): Map<number, number> => {
    const sorted = [...arr].sort((a, b) => a.t - b.t);
    const out = new Map<number, number>();
    let last = sorted[0].v;
    let idx = 0;
    for (const t of ts) {
      while (idx < sorted.length && sorted[idx].t <= t) {
        last = sorted[idx].v;
        idx++;
      }
      out.set(t, last);
    }
    return out;
  };
  const fm = ff(from);
  const tm = ff(to);
  return ts
    .map((t) => {
      const a = fm.get(t)!;
      const b = tm.get(t)!;
      return { t, v: a / b };
    })
    .filter((p) => Number.isFinite(p.v) && p.v > 0);
}

export const Route = createFileRoute("/api/public/pair-history")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const guard = await requireRequestUser(request);
        if (guard) return guard;
        const url = new URL(request.url);
        const from = (url.searchParams.get("from") || "").toLowerCase();
        const to = (url.searchParams.get("to") || "").toLowerCase();
        const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days") || "7")));
        if (!from || !to) {
          return new Response(JSON.stringify({ error: "missing from/to" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const ck = `${from}>${to}:${days}`;
        const c = cache.get(ck);
        if (c && Date.now() - c.at < CACHE_MS) {
          return new Response(JSON.stringify(c.payload), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        try {
          const [a, b] = await Promise.all([vndSeries(from, days), vndSeries(to, days)]);
          const points = combine(a.points, b.points);
          const payload: Payload = {
            from,
            to,
            days,
            points,
            source: a.source === b.source ? a.source : `${a.source} + ${b.source}`,
          };
          cache.set(ck, { at: Date.now(), payload });
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...CORS },
          });
        } catch (e) {
          const fallback = cache.get(ck)?.payload;
          if (fallback) {
            return new Response(JSON.stringify(fallback), {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          return new Response(JSON.stringify({ error: (e as Error).message, points: [], source: "error" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});