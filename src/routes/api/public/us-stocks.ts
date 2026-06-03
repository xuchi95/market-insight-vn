import { createFileRoute } from "@tanstack/react-router";

interface UsStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  exchange: string;
  updatedAt: number;
}

// Curated list — kept small to respect FMP Free plan (250 calls/day).
// Free plan does NOT support batch quote, so each symbol = 1 call.
const SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "AAPL",  name: "Apple" },
  { symbol: "MSFT",  name: "Microsoft" },
  { symbol: "NVDA",  name: "NVIDIA" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN",  name: "Amazon" },
  { symbol: "META",  name: "Meta" },
  { symbol: "TSLA",  name: "Tesla" },
  { symbol: "SPY",   name: "S&P 500 ETF" },
];

// 1-hour cache → worst case 8 * 24 = 192 calls/day, under 250 quota.
const CACHE_MS = 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 6000;

let cache: { at: number; items: UsStock[] } | null = null;
let inflight: Promise<UsStock[]> | null = null;

interface FmpQuote {
  symbol?: string;
  name?: string;
  price?: number;
  change?: number;
  changePercentage?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  marketCap?: number;
  exchange?: string;
  timestamp?: number;
}

async function fetchQuote(symbol: string, apiKey: string): Promise<FmpQuote | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${apiKey}`,
      { headers: { accept: "application/json" }, signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0] as FmpQuote;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function buildItems(): Promise<UsStock[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error("FMP_API_KEY is not configured");

  // Sequential to avoid bursting the upstream from a single Worker.
  const out: UsStock[] = [];
  for (const meta of SYMBOLS) {
    const q = await fetchQuote(meta.symbol, apiKey);
    if (!q || typeof q.price !== "number") continue;
    out.push({
      symbol: meta.symbol,
      name: meta.name,
      price: q.price,
      change: q.change ?? 0,
      changePct: q.changePercentage ?? 0,
      dayHigh: q.dayHigh ?? q.price,
      dayLow: q.dayLow ?? q.price,
      volume: q.volume ?? 0,
      marketCap: q.marketCap ?? 0,
      exchange: q.exchange ?? "",
      updatedAt: (q.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
    });
  }
  return out;
}

function refresh(): Promise<UsStock[]> {
  if (inflight) return inflight;
  inflight = buildItems()
    .then((items) => {
      if (items.length) cache = { at: Date.now(), items };
      return items;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/us-stocks")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const guard = await requireRequestUser(request);
        if (guard) return guard;
        try {
          let items: UsStock[];
          if (cache && Date.now() - cache.at < CACHE_MS) {
            items = cache.items;
          } else {
            try {
              items = await refresh();
              if (!items.length && cache) items = cache.items;
            } catch {
              if (cache) items = cache.items;
              else throw new Error("FMP upstream unavailable");
            }
          }
          return Response.json(
            { items, fetchedAt: Date.now(), source: "fmp" },
            {
              headers: {
                "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600",
                ...CORS,
              },
            },
          );
        } catch (err) {
          return Response.json(
            { error: (err as Error).message, items: [] },
            { status: 502, headers: CORS },
          );
        }
      },
    },
  },
});