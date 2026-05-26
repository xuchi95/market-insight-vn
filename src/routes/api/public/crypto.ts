import { createFileRoute } from "@tanstack/react-router";

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
] as const;

const CACHE_MS = 30 * 1000; // 30s (CoinGecko free tier friendly)
let cache: { at: number; payload: any } | null = null;

interface CGMarket {
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

function buildSparkline(input: number[] | undefined, priceUsd: number): number[] {
  const arr = Array.isArray(input) ? input.filter((n) => Number.isFinite(n)) : [];
  if (arr.length > 0) return arr.slice(-48);
  const base = priceUsd > 0 ? priceUsd : 1;
  return Array.from({ length: 48 }, (_, i) => base * (1 + Math.sin(i / 6) * 0.005));
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

async function buildPayload() {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", COIN_IDS.join(","));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "24h");

  const [res, usdVnd] = await Promise.all([
    fetch(url.toString(), { headers: { accept: "application/json" } }),
    fetchUsdVnd(),
  ]);
  if (!res.ok) throw new Error(`crypto upstream ${res.status}`);
  const raw = await res.json();
  const data: CGMarket[] = Array.isArray(raw) ? raw : [];

  const coins = data
    .filter((m) => m && (m.id || m.symbol))
    .map((m) => {
      const id = String(m.id ?? m.symbol ?? "").toLowerCase();
      const symbol = String(m.symbol ?? id).toUpperCase();
      const name = String(m.name ?? symbol);
      const priceUsd = toNum(m.current_price, 0);
      return {
        id,
        symbol,
        name,
        image: typeof m.image === "string" ? m.image : "",
        priceUsd,
        priceVnd: priceUsd * usdVnd,
        change24h: toNum(m.price_change_percentage_24h, 0),
        marketCap: toNum(m.market_cap, 0),
        volume24h: toNum(m.total_volume, 0),
        sparkline: buildSparkline(m.sparkline_in_7d?.price, priceUsd),
      };
    });

  return { updatedAt: Date.now(), usdVnd, coins };
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
          if (!cache || Date.now() - cache.at > CACHE_MS) {
            const payload = await buildPayload();
            cache = { at: Date.now(), payload };
          }
          return new Response(JSON.stringify(cache.payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=30",
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