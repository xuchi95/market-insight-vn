import { createFileRoute } from "@tanstack/react-router";

const CACHE_MS = 60 * 1000;
const cache = new Map<string, { at: number; payload: any }>();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/crypto-chart")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = (url.searchParams.get("id") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
        const days = (url.searchParams.get("days") || "7").replace(/[^0-9]/g, "") || "7";
        if (!id) {
          return new Response(JSON.stringify({ error: "missing id" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
        }
        const key = `${id}:${days}`;
        try {
          const cached = cache.get(key);
          if (!cached || Date.now() - cached.at > CACHE_MS) {
            const up = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
            const r = await fetch(up, { headers: { accept: "application/json" } });
            if (!r.ok) throw new Error(`upstream ${r.status}`);
            const j: any = await r.json();
            const prices = (j?.prices ?? []) as [number, number][];
            const payload = { id, days, prices: prices.map(([t, v]) => ({ t, v })) };
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