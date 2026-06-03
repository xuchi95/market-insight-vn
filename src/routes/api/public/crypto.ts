import { createFileRoute } from "@tanstack/react-router";
import { readPriceCache, writePriceCache } from "@/lib/price-cache.server";

// CoinGecko coin IDs (public free API, no key required, ~30 req/min)
const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "tether",
  "binancecoin",
  "solana",
  "ripple",
  "dogecoin",
  "the-open-network",
  "cardano",
  "avalanche-2",
  "tron",
  "chainlink",
  "polkadot",
  "polygon-ecosystem-token",
  "shiba-inu",
  "litecoin",
  "bitcoin-cash",
  "uniswap",
  "stellar",
  "near",
  "internet-computer",
  "aptos",
  "cosmos",
  "monero",
  "ethereum-classic",
  "filecoin",
  "hedera-hashgraph",
  "arbitrum",
  "vechain",
  "maker",
  "render-token",
  "injective-protocol",
  "optimism",
  "sui",
  "pepe",
  "usd-coin",
  "dai",
  "wrapped-bitcoin",
  "leo-token",
  "kaspa",
] as const;

// Free CoinGecko data refreshes every ~30-60s upstream. Re-poll often enough
// to feel realtime while staying well under the public rate limit.
const CACHE_FRESH_MS = 20 * 1000;
const CACHE_SWR_MS = 5 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 6_000;
let cache: { at: number; payload: any } | null = null;
let inflight: Promise<any> | null = null;

interface CGAsset {
  id?: string;
  symbol?: string;
  name?: string;
  image?: string;
  current_price?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
  price_change_percentage_24h?: number | null;
  sparkline_in_7d?: { price?: number[] } | null;
}

const FALLBACK_USD_VND = 25_400;

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSparkline(input: number[] | undefined, priceUsd: number): number[] {
  const arr = Array.isArray(input) ? input.filter((n) => Number.isFinite(n)) : [];
  if (arr.length === 0) {
    const base = priceUsd > 0 ? priceUsd : 1;
    return Array.from({ length: 48 }, (_, i) => base * (1 + Math.sin(i / 6) * 0.005));
  }
  // Downsample to ~48 points for compact wire size while keeping shape.
  if (arr.length <= 48) return arr;
  const step = arr.length / 48;
  const out: number[] = [];
  for (let i = 0; i < 48; i++) out.push(arr[Math.min(arr.length - 1, Math.floor(i * step))]);
  out[out.length - 1] = arr[arr.length - 1]; // preserve latest
  return out;
}

async function fetchUsdVnd(): Promise<number> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!r.ok) throw new Error(String(r.status));
    const j: any = await r.json();
    const v = Number(j?.rates?.VND);
    if (Number.isFinite(v) && v > 0) return v;
  } catch { /* ignore */ }
  return FALLBACK_USD_VND;
}

function cgHeaders() {
  const h: Record<string, string> = { accept: "application/json" };
  const key = process.env.COINGECKO_API_KEY;
  if (key) h["x-cg-demo-api-key"] = key;
  return h;
}

async function buildPayload() {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", COIN_IDS.join(","));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "24h");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);

  let data: CGAsset[];
  let usdVnd: number;
  try {
    const [res, usdVndVal] = await Promise.all([
      fetch(url, { headers: cgHeaders(), signal: ctrl.signal }),
      fetchUsdVnd(),
    ]);
    if (!res.ok) throw new Error(`crypto upstream ${res.status}`);
    data = (await res.json()) as CGAsset[];
    usdVnd = usdVndVal;
  } finally {
    clearTimeout(timer);
  }

  const ordered = COIN_IDS
    .map((id) => data.find((m) => m?.id === id))
    .filter((m): m is CGAsset => !!m);

  const coins = ordered.map((m) => {
    const id = String(m.id ?? m.symbol ?? "").toLowerCase();
    const symbol = String(m.symbol ?? id).toUpperCase();
    const name = String(m.name ?? symbol);
    const priceUsd = toNum(m.current_price, 0);
    return {
      id,
      symbol,
      name,
      image: m.image ?? "",
      priceUsd,
      priceVnd: priceUsd * usdVnd,
      change24h: toNum(m.price_change_percentage_24h, 0),
      marketCap: toNum(m.market_cap, 0),
      volume24h: toNum(m.total_volume, 0),
      sparkline: normalizeSparkline(m.sparkline_in_7d?.price, priceUsd),
    };
  });

  return { updatedAt: Date.now(), usdVnd, coins };
}

function refresh(): Promise<any> {
  if (inflight) return inflight;
  inflight = buildPayload()
    .then((payload) => {
      cache = { at: Date.now(), payload };
      writePriceCache("crypto", payload);
      return payload;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/crypto")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          // Cold start: hydrate in-memory cache from DB so we never wait on
          // CoinGecko's 3–6s upstream when a fresh isolate spins up.
          if (!cache) {
            const seed = await readPriceCache<any>("crypto", CACHE_SWR_MS);
            if (seed) cache = { at: seed.updatedAt, payload: seed.payload };
          }
          let payload: any;
          const age = cache ? Date.now() - cache.at : Infinity;
          if (cache && age < CACHE_FRESH_MS) {
            payload = cache.payload;
          } else if (cache && age < CACHE_SWR_MS) {
            payload = cache.payload;
            refresh().catch(() => {});
          } else {
            try {
              payload = await refresh();
            } catch (e) {
              if (cache) payload = cache.payload;
              else throw e;
            }
          }
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control":
                "public, max-age=15, s-maxage=20, stale-while-revalidate=300",
              ...CORS,
            },
          });
        } catch (e) {
          if (cache) {
            return new Response(JSON.stringify(cache.payload), {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 502,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});