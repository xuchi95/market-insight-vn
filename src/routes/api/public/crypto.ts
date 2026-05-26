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
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

async function fetchUsdVnd(): Promise<number> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!r.ok) throw new Error(String(r.status));
    const j: any = await r.json();
    const v = Number(j?.rates?.VND);
    if (Number.isFinite(v) && v > 0) return v;
  } catch { /* ignore */ }
  return 25_400;
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
  const data: CGMarket[] = await res.json();

  const coins = data.map((m) => ({
    id: m.id,
    symbol: m.symbol.toUpperCase(),
    name: m.name,
    image: m.image,
    priceUsd: m.current_price,
    priceVnd: m.current_price * usdVnd,
    change24h: m.price_change_percentage_24h ?? 0,
    marketCap: m.market_cap,
    volume24h: m.total_volume,
    sparkline: m.sparkline_in_7d?.price?.slice(-48) ?? [],
  }));

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