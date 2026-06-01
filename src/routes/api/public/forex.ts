import { createFileRoute } from "@tanstack/react-router";

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

// Cache hôm-qua close riêng (24h), vì Yahoo cập nhật theo ngày.
const PREV_TTL_MS = 60 * 60 * 1000;
let prevCloseCache: { at: number; map: Map<string, number> } | null = null;

async function yahooPrevClose(code: string): Promise<number | null> {
  // VND/VND không có gì để so
  if (code === "VND") return null;
  const sym = `${code}VND=X`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", accept: "application/json" } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const closes: (number | null)[] = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    // Lấy giá đóng cửa gần nhất TRƯỚC giá mới nhất (≈ hôm qua)
    const valid = closes.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (valid.length < 2) return null;
    return valid[valid.length - 2];
  } catch {
    return null;
  }
}

async function getPrevCloses(codes: string[]): Promise<Map<string, number>> {
  if (prevCloseCache && Date.now() - prevCloseCache.at < PREV_TTL_MS) {
    return prevCloseCache.map;
  }
  const results = await Promise.all(codes.map(async (c) => [c, await yahooPrevClose(c)] as const));
  const map = new Map<string, number>();
  for (const [c, v] of results) if (v && v > 0) map.set(c, v);
  prevCloseCache = { at: Date.now(), map };
  return map;
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
  const prevMap = await getPrevCloses(CURRENCIES.map((c) => c.code));
  const data = CURRENCIES.map((c) => {
    // mid = VND per 1 unit of `code`
    const mid = c.code === "USD" ? usdVnd : usdVnd / (rates[c.code] || NaN);
    const buy = mid * (1 - c.spread / 2);
    const sell = mid * (1 + c.spread / 2);
    const prev = prevMap.get(c.code);
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
      },
    },
  },
});