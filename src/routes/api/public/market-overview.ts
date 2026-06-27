import { createFileRoute } from "@tanstack/react-router";

/**
 * /api/public/market-overview
 *
 * One-shot snapshot used by the homepage hero card. Aggregates:
 * - VN-Index (KBSec via /api/public/stocks)
 * - USD/VND mid rate (via /api/public/forex)
 * - BTC dominance % (CoinGecko /global, public)
 * - Fear & Greed (alternative.me, via /api/public/fear-greed)
 * - Sparkline 24h: BTC USD prices (CoinGecko market_chart, 1d)
 *
 * All fields are best-effort; a failing upstream returns null for that field
 * rather than 500. Cached 60s at the edge to absorb refreshes.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
  "content-type": "application/json; charset=utf-8",
};

type Kpi = { value: number; changePct: number | null } | null;

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { accept: "application/json", ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getVnIndex(origin: string): Promise<Kpi> {
  const j = await safeJson<{ items?: Array<{ code: string; value: number; changePct: number }> }>(`${origin}/api/public/stocks`);
  const it = j?.items?.find((x) => x.code === "VNINDEX");
  if (!it) return null;
  return { value: it.value, changePct: typeof it.changePct === "number" ? it.changePct : null };
}

async function getUsdVnd(origin: string): Promise<Kpi> {
  const j = await safeJson<{ rates?: Array<{ code: string; mid: number; changePct: number }> }>(`${origin}/api/public/forex`);
  const it = j?.rates?.find((x) => x.code === "USD");
  if (!it) return null;
  return { value: it.mid, changePct: typeof it.changePct === "number" ? it.changePct : null };
}

async function getBtcDominance(): Promise<Kpi> {
  const j = await safeJson<{ data?: { market_cap_percentage?: { btc?: number }; market_cap_change_percentage_24h_usd?: number } }>(
    "https://api.coingecko.com/api/v3/global"
  );
  const v = j?.data?.market_cap_percentage?.btc;
  if (typeof v !== "number") return null;
  return { value: v, changePct: null };
}

async function getFearGreed(origin: string): Promise<Kpi & { label?: string }> {
  const j = await safeJson<{ current?: { value: number; classification: string }; yesterday?: { value: number } }>(
    `${origin}/api/public/fear-greed`
  );
  if (!j?.current) return null;
  const diff = j.yesterday ? j.current.value - j.yesterday.value : null;
  return { value: j.current.value, changePct: diff, label: j.current.classification };
}

async function getBtcSparkline(): Promise<number[] | null> {
  const j = await safeJson<{ prices?: Array<[number, number]> }>(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1"
  );
  if (!j?.prices?.length) return null;
  // Downsample to ~48 points to keep payload small.
  const src = j.prices;
  const step = Math.max(1, Math.floor(src.length / 48));
  const out: number[] = [];
  for (let i = 0; i < src.length; i += step) out.push(src[i][1]);
  if (out[out.length - 1] !== src[src.length - 1][1]) out.push(src[src.length - 1][1]);
  return out;
}

export const Route = createFileRoute("/api/public/market-overview")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const [vnIndex, usdVnd, btcDom, fng, spark] = await Promise.all([
          getVnIndex(origin),
          getUsdVnd(origin),
          getBtcDominance(),
          getFearGreed(origin),
          getBtcSparkline(),
        ]);
        return new Response(
          JSON.stringify({
            vnIndex,
            usdVnd,
            btcDominance: btcDom,
            fearGreed: fng,
            sparkline: spark,
            fetchedAt: Date.now(),
          }),
          { status: 200, headers: CORS }
        );
      },
    },
  },
});