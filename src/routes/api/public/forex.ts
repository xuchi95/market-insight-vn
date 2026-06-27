import { createFileRoute } from "@tanstack/react-router";
import { readPriceCache, writePriceCache } from "@/lib/price-cache.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPriceChangeConfig } from "@/lib/price-change-config.server";
import { instrument } from "@/lib/observability/request-metrics.server";

// Currencies we expose (must match client BASE list)
const CURRENCIES: { code: string; name: string; spread: number }[] = [
  { code: "USD", name: "Đô la Mỹ",        spread: 0.0095 },
  { code: "EUR", name: "Euro",            spread: 0.0130 },
  { code: "GBP", name: "Bảng Anh",        spread: 0.0145 },
  { code: "JPY", name: "Yên Nhật",        spread: 0.0170 },
  { code: "CNY", name: "Nhân dân tệ",     spread: 0.0140 },
  { code: "KRW", name: "Won Hàn Quốc",    spread: 0.0260 },
  { code: "SGD", name: "Đô la Singapore", spread: 0.0145 },
  { code: "THB", name: "Baht Thái",       spread: 0.0240 },
  { code: "AUD", name: "Đô la Úc",        spread: 0.0160 },
  { code: "CAD", name: "Đô la Canada",    spread: 0.0150 },
  { code: "CHF", name: "Franc Thuỵ Sĩ",   spread: 0.0145 },
  { code: "HKD", name: "Đô la Hồng Kông", spread: 0.0150 },
];

const CACHE_MS = 10 * 60 * 1000; // 10 minutes
let cache: { at: number; payload: Awaited<ReturnType<typeof buildPayload>> } | null = null;

// 24h delta nguồn DB (giống pattern gold) — không còn phụ thuộc Yahoo.
const WINDOW_MS = 24 * 60 * 60 * 1000;
const SYMBOL_PREFIX = "FX:";
let lastSnapshotAt = 0;

/** Lấy giá ~24h trước cho danh sách mã từ price_history. */
async function fetch24hAgoMids(codes: string[]): Promise<Record<string, number>> {
  if (codes.length === 0) return {};
  const out: Record<string, number> = {};
  try {
    const cfg = await getPriceChangeConfig();
    if (!cfg.enabled) return out;
    const now = Date.now();
    const lo = new Date(now - WINDOW_MS - cfg.windowToleranceMs).toISOString();
    const hi = new Date(now - WINDOW_MS + cfg.windowToleranceMs).toISOString();
    const symbols = codes.map((c) => `${SYMBOL_PREFIX}${c}`);
    const { data } = await supabaseAdmin
      .from("price_history")
      .select("symbol, price, captured_at")
      .in("symbol", symbols)
      .gte("captured_at", lo)
      .lte("captured_at", hi)
      .order("captured_at", { ascending: false })
      .limit(2000);
    if (!data) return out;
    const target = now - WINDOW_MS;
    const best: Record<string, { dist: number; price: number }> = {};
    const counts: Record<string, number> = {};
    for (const r of data) {
      const sym = String(r.symbol);
      const code = sym.startsWith(SYMBOL_PREFIX) ? sym.slice(SYMBOL_PREFIX.length) : sym;
      const p = Number(r.price);
      if (!Number.isFinite(p) || p <= 0) continue;
      const t = new Date(r.captured_at as string).getTime();
      if (cfg.minSampleAgeMs > 0 && now - t < cfg.minSampleAgeMs) continue;
      const dist = Math.abs(t - target);
      const cur = best[code];
      if (!cur || dist < cur.dist) best[code] = { dist, price: p };
      counts[code] = (counts[code] ?? 0) + 1;
    }
    for (const c of codes) {
      if (best[c] && (counts[c] ?? 0) >= cfg.minSamples) out[c] = best[c].price;
    }
    return out;
  } catch {
    return out;
  }
}

/** Ghi snapshot cho tất cả mã (throttle theo config). Fire-and-forget. */
async function recordSnapshots(rows: { code: string; mid: number }[]) {
  const cfg = await getPriceChangeConfig();
  const now = Date.now();
  if (now - lastSnapshotAt < cfg.snapshotMinIntervalMs) return;
  lastSnapshotAt = now;
  const insert = rows
    .filter((r) => Number.isFinite(r.mid) && r.mid > 0)
    .map((r) => ({ symbol: `${SYMBOL_PREFIX}${r.code}`, price: r.mid }));
  if (insert.length === 0) return;
  void supabaseAdmin
    .from("price_history")
    .insert(insert)
    .then(() => undefined, () => undefined);
}

async function buildPayload() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`forex upstream ${res.status}`);
  const j: any = await res.json();
  const rates: Record<string, number> = j?.rates ?? {};
  const usdVnd: number = rates.VND;
  if (!usdVnd) throw new Error("forex upstream missing VND");

  const now = Date.now();
  // 1) Tính mid hiện tại cho từng mã.
  const mids = CURRENCIES.map((c) => {
    const mid = c.code === "USD" ? usdVnd : usdVnd / (rates[c.code] || NaN);
    return { code: c.code, mid };
  }).filter((r) => Number.isFinite(r.mid) && r.mid > 0);

  // 2) Lấy snapshot ~24h trước từ DB và ghi snapshot mới (fire-and-forget).
  const prevMap = await fetch24hAgoMids(mids.map((m) => m.code));
  void recordSnapshots(mids);

  const data = CURRENCIES.map((c) => {
    // mid = VND per 1 unit of `code`
    const mid = c.code === "USD" ? usdVnd : usdVnd / (rates[c.code] || NaN);
    const buy = mid * (1 - c.spread / 2);
    const sell = mid * (1 + c.spread / 2);
    const prev = prevMap[c.code];
    const changePct = prev && prev > 0 ? ((mid - prev) / prev) * 100 : 0;
    return {
      code: c.code,
      name: c.name,
      buy: Math.round(buy * 100) / 100,
      sell: Math.round(sell * 100) / 100,
      mid: Math.round(mid * 100) / 100,
      changePct: Math.round(changePct * 1000) / 1000,
      updatedAt: now,
    };
  }).filter((r) => Number.isFinite(r.mid));

  return { updatedAt: now, rates: data };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/forex")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: instrument("public.forex", async () => {
        try {
          // Cold start: seed in-memory cache from DB so the request can serve
          // instantly while a stale entry triggers a background refresh.
          if (!cache) {
            const seed = await readPriceCache<Awaited<ReturnType<typeof buildPayload>>>(
              "forex",
              CACHE_MS * 6,
            );
            if (seed) cache = { at: seed.updatedAt, payload: seed.payload };
          }
          if (!cache || Date.now() - cache.at > CACHE_MS) {
            const payload = await buildPayload();
            cache = { at: Date.now(), payload };
            writePriceCache("forex", payload);
          }
          return new Response(JSON.stringify(cache.payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=600",
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
      }),
    },
  },
});