import { createFileRoute } from "@tanstack/react-router";

const CACHE_MS = 60 * 1000;
const cache = new Map<string, { at: number; payload: any }>();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Map CoinGecko-style IDs (legacy clients) to CoinCap IDs
const ID_ALIAS: Record<string, string> = {
  binancecoin: "binance-coin",
  ripple: "xrp",
  "the-open-network": "toncoin",
  "avalanche-2": "avalanche",
};

function ccHeaders() {
  const key = process.env.COINCAP_API_KEY;
  const h: Record<string, string> = { accept: "application/json" };
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

function intervalFor(days: number): string {
  if (days <= 1) return "m15";
  if (days <= 7) return "h2";
  if (days <= 30) return "h6";
  return "d1";
}

export const Route = createFileRoute("/api/public/crypto-chart")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
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
            const end = Date.now();
            const start = end - dn * 24 * 60 * 60 * 1000;
            const interval = intervalFor(dn);
            const up = `https://rest.coincap.io/v3/assets/${id}/history?interval=${interval}&start=${start}&end=${end}`;
            const r = await fetch(up, { headers: ccHeaders() });
            if (!r.ok) throw new Error(`upstream ${r.status}`);
            const j: any = await r.json();
            const arr: any[] = Array.isArray(j?.data) ? j.data : [];
            const prices = arr
              .map((p) => ({ t: Number(p?.time), v: Number(p?.priceUsd) }))
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
      },
    },
  },
});