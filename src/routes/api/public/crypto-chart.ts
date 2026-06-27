import { createFileRoute } from "@tanstack/react-router";
import { instrument } from "@/lib/observability/request-metrics.server";

const CACHE_MS = 60 * 1000;
const cache = new Map<string, { at: number; payload: any }>();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Map CoinCap-style IDs (legacy clients) to CoinGecko IDs
const ID_ALIAS: Record<string, string> = {
  "binance-coin": "binancecoin",
  xrp: "ripple",
  toncoin: "the-open-network",
  avalanche: "avalanche-2",
};

function cgHeaders() {
  const h: Record<string, string> = { accept: "application/json" };
  const key = process.env.COINGECKO_API_KEY;
  if (key) h["x-cg-demo-api-key"] = key;
  return h;
}

export const Route = createFileRoute("/api/public/crypto-chart")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: instrument("public.crypto-chart", async ({ request }) => {
        const url = new URL(request.url);
        const rawId = (url.searchParams.get("id") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
        const id = ID_ALIAS[rawId] || rawId;
        const days = (url.searchParams.get("days") || "7").replace(/[^0-9]/g, "") || "7";
        if (!id) {
          return new Response(JSON.stringify({ error: "missing id" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
        }
        const key = `${id}:${days}`;
        try {
          const cached = cache.get(key);
          if (!cached || Date.now() - cached.at > CACHE_MS) {
            const dn = Math.max(1, Number(days) || 7);
            const up = new URL(`https://api.coingecko.com/api/v3/coins/${id}/market_chart`);
            up.searchParams.set("vs_currency", "usd");
            up.searchParams.set("days", String(dn));
            const r = await fetch(up, { headers: cgHeaders() });
            if (!r.ok) throw new Error(`upstream ${r.status}`);
            const j: any = await r.json();
            const arr: any[] = Array.isArray(j?.prices) ? j.prices : [];
            const prices = arr
              .map((p) => ({ t: Number(p?.[0]), v: Number(p?.[1]) }))
              .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
            const payload = { id, days, prices };
            cache.set(key, { at: Date.now(), payload });
          }
          return new Response(JSON.stringify(cache.get(key)!.payload), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", ...CORS },
          });
        } catch (e) {
          const cached = cache.get(key);
          if (cached) {
            return new Response(JSON.stringify(cached.payload), { status: 200, headers: { "Content-Type": "application/json", ...CORS } });
          }
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 502, headers: { "Content-Type": "application/json", ...CORS } });
        }
      }),
    },
  },
});