import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPriceChangeConfig } from "@/lib/price-change-config.server";

// Gói Copper: 2,500 calls/tháng (~83/ngày).
// Cache 30 phút => ~48 calls/ngày, ~1,440/tháng — chừa ~40% buffer cho retry/burst.
const CACHE_MS = 30 * 60 * 1000;
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
let inflight: Promise<MetalItem[]> | null = null;

// 24h delta nguồn DB (giống pattern forex/gold) — in-memory `prev` không bền vững
// trên Cloudflare Worker (cold-start reset → luôn 0%).
const WINDOW_MS = 24 * 60 * 60 * 1000;
const SYMBOL_PREFIX = "METAL:";
let lastSnapshotAt = 0;

async function fetch24hAgoPrices(): Promise<Partial<Record<Sym, number>>> {
  const out: Partial<Record<Sym, number>> = {};
  try {
    const cfg = await getPriceChangeConfig();
    if (!cfg.enabled) return out;
    const now = Date.now();
    const lo = new Date(now - WINDOW_MS - cfg.windowToleranceMs).toISOString();
    const hi = new Date(now - WINDOW_MS + cfg.windowToleranceMs).toISOString();
    const symbols = SYMBOLS.map((s) => `${SYMBOL_PREFIX}${s}`);
    const { data } = await supabaseAdmin
      .from("price_history")
      .select("symbol, price, captured_at")
      .in("symbol", symbols)
      .gte("captured_at", lo)
      .lte("captured_at", hi)
      .order("captured_at", { ascending: false })
      .limit(1000);
    if (!data) return out;
    const target = now - WINDOW_MS;
    const best: Partial<Record<Sym, { dist: number; price: number }>> = {};
    for (const r of data) {
      const sym = String(r.symbol);
      const code = sym.slice(SYMBOL_PREFIX.length) as Sym;
      if (!SYMBOLS.includes(code)) continue;
      const p = Number(r.price);
      if (!Number.isFinite(p) || p <= 0) continue;
      const t = new Date(r.captured_at as string).getTime();
      if (cfg.minSampleAgeMs > 0 && now - t < cfg.minSampleAgeMs) continue;
      const dist = Math.abs(t - target);
      const cur = best[code];
      if (!cur || dist < cur.dist) best[code] = { dist, price: p };
    }
    for (const s of SYMBOLS) if (best[s]) out[s] = best[s]!.price;
    return out;
  } catch {
    return out;
  }
}

async function recordSnapshots(items: { symbol: Sym; priceUsd: number }[]) {
  const cfg = await getPriceChangeConfig();
  const now = Date.now();
  if (now - lastSnapshotAt < cfg.snapshotMinIntervalMs) return;
  lastSnapshotAt = now;
  const insert = items
    .filter((i) => Number.isFinite(i.priceUsd) && i.priceUsd > 0)
    .map((i) => ({ symbol: `${SYMBOL_PREFIX}${i.symbol}`, price: i.priceUsd }));
  if (insert.length === 0) return;
  void supabaseAdmin
    .from("price_history")
    .insert(insert)
    .then(() => undefined, () => undefined);
}

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
    const raw: { symbol: Sym; priceUsd: number }[] = [];
    for (const s of SYMBOLS) {
      const rate = Number(rates[s]);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      // Metals-API returns 1 USD = rate ounces, so 1 oz = 1/rate USD
      const priceUsd = 1 / rate;
      raw.push({ symbol: s, priceUsd });
    }
    if (raw.length === 0) throw new Error("metals empty response");
    const prevMap = await fetch24hAgoPrices();
    void recordSnapshots(raw);
    const items: MetalItem[] = raw.map(({ symbol, priceUsd }) => {
      const prevPrice = prevMap[symbol];
      const changePct = prevPrice && prevPrice > 0 ? ((priceUsd - prevPrice) / prevPrice) * 100 : 0;
      return { symbol, name: META[symbol].name, nameVi: META[symbol].nameVi, priceUsd, changePct: Math.round(changePct * 1000) / 1000, updatedAt: now };
    });
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