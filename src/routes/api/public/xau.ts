import { createFileRoute } from "@tanstack/react-router";

const CACHE_MS = 60_000;
let cache: { at: number; payload: { price: number; changePct: number; updatedAt: number } } | null = null;
let prevPrice: number | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchXau() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`xau upstream ${res.status}`);
    const j: any = await res.json();
    const price = Number(j?.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("invalid xau price");
    const changePct = prevPrice && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    prevPrice = price;
    return { price, changePct, updatedAt: Date.now() };
  } finally {
    clearTimeout(t);
  }
}

export const Route = createFileRoute("/api/public/xau")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          if (!cache || Date.now() - cache.at > CACHE_MS) {
            const payload = await fetchXau();
            cache = { at: Date.now(), payload };
          }
          return new Response(JSON.stringify(cache.payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
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