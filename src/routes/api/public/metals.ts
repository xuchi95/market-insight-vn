import { createFileRoute } from "@tanstack/react-router";

const CACHE_MS = 6 * 60 * 60 * 1000; // 6h — free tier ~100 req/month
const SYMBOLS = ["XAU", "XAG", "XPT", "XPD"] as const;
type Sym = (typeof SYMBOLS)[number];

const META: Record<Sym, { name: string; nameVi: string }> = {
  XAU: { name: "Gold", nameVi: "Vàng" },
  XAG: { name: "Silver", nameVi: "Bạc" },
  XPT: { name: "Platinum", nameVi: "Bạch kim" },
  XPD: { name: "Palladium", nameVi: "Palladi" },
};

interface MetalItem {
  symbol: Sym;
  name: string;
  nameVi: string;
  priceUsd: number; // per ounce
  changePct: number;
  updatedAt: number;
}

let cache: { at: number; items: MetalItem[] } | null = null;
const prev = new Map<Sym, number>();
let inflight: Promise<MetalItem[]> | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchMetals(): Promise<MetalItem[]> {
  const key = process.env.METALS_API_KEY;
  if (!key) throw new Error("METALS_API_KEY not configured");
  const url = `https://metals-api.com/api/latest?access_key=${encodeURIComponent(key)}&base=USD&symbols=${SYMBOLS.join(",")}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`metals upstream ${res.status}`);
    const j: any = await res.json();
    if (j?.success === false) throw new Error(j?.error?.info || j?.error?.type || "metals api error");
    const rates = j?.rates ?? {};
    const now = Date.now();
    const items: MetalItem[] = [];
    for (const s of SYMBOLS) {
      const rate = Number(rates[s]);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      // Metals-API returns 1 USD = rate ounces, so 1 oz = 1/rate USD
      const priceUsd = 1 / rate;
      const prevPrice = prev.get(s);
      const changePct = prevPrice && prevPrice > 0 ? ((priceUsd - prevPrice) / prevPrice) * 100 : 0;
      prev.set(s, priceUsd);
      items.push({ symbol: s, name: META[s].name, nameVi: META[s].nameVi, priceUsd, changePct, updatedAt: now });
    }
    if (items.length === 0) throw new Error("metals empty response");
    return items;
  } finally {
    clearTimeout(t);
  }
}

async function refresh(): Promise<MetalItem[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const items = await fetchMetals();
      cache = { at: Date.now(), items };
      return items;
    } catch (e) {
      if (cache) return cache.items;
      throw e;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export const Route = createFileRoute("/api/public/metals")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          if (!cache || Date.now() - cache.at > CACHE_MS) {
            await refresh();
          }
          return new Response(JSON.stringify({ items: cache!.items, updatedAt: cache!.at }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600",
              ...CORS,
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message, items: [] }), {
            status: 502,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});