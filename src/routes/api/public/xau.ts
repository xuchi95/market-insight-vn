import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CACHE_MS = 60_000;
/** Khoảng cách mẫu để tính % 24h. */
const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Cho phép lệch ±Nh khi không có mẫu chính xác 24h trước. Cấu hình qua env. */
const WINDOW_TOLERANCE_MS =
  (Number(process.env.PRICE_WINDOW_TOLERANCE_HOURS) || 2) * 60 * 60 * 1000;
/** Ngưỡng tối thiểu (giờ) lệch khỏi mốc 24h để mẫu được chấp nhận tính %. Mặc định = tolerance. */
const MIN_SAMPLE_AGE_MS =
  (Number(process.env.PRICE_MIN_SAMPLE_AGE_HOURS) || 0) * 60 * 60 * 1000;
/** Chỉ ghi 1 snapshot / N phút để không phình bảng. */
const SNAPSHOT_MIN_INTERVAL_MS =
  (Number(process.env.PRICE_SNAPSHOT_MIN_INTERVAL_MINUTES) || 5) * 60 * 1000;
const SYMBOL = "XAUUSD";

/** Đơn vị giá vàng thế giới: USD trên một troy ounce (1 oz = 31.1035 g). */
const UNIT = "USD/oz" as const;

interface XauPayload {
  /** Giá hiện tại (USD/oz). */
  price: number;
  /** Giá mua / bán theo upstream — `null` nếu không có (gold-api chỉ cung cấp mid price). */
  bid: number | null;
  ask: number | null;
  /** % thay đổi so với lần fetch trước (xấp xỉ realtime, không phải 24h). */
  changePct: number;
  /** ISO timestamp upstream gửi về (epoch ms). */
  updatedAt: number;
  unit: typeof UNIT;
  source: { name: string; url: string };
}

let cache: { at: number; payload: XauPayload } | null = null;
let lastSnapshotAt = 0;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** Tìm giá XAU cách ~24h trong DB để tính % thay đổi thật. */
async function fetchPrice24hAgo(): Promise<number | null> {
  try {
    const target = new Date(Date.now() - WINDOW_MS);
    const lo = new Date(target.getTime() - WINDOW_TOLERANCE_MS).toISOString();
    const hi = new Date(target.getTime() + WINDOW_TOLERANCE_MS).toISOString();
    // Lấy mẫu gần nhất TRƯỚC mốc 24h (fallback: mẫu cũ nhất trong cửa sổ).
    const { data } = await supabaseAdmin
      .from("price_history")
      .select("price, captured_at")
      .eq("symbol", SYMBOL)
      .gte("captured_at", lo)
      .lte("captured_at", hi)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    // Reject mẫu quá gần hiện tại (chưa đủ "tuổi") nếu cấu hình MIN_SAMPLE_AGE_MS.
    if (MIN_SAMPLE_AGE_MS > 0) {
      const age = Date.now() - new Date(data.captured_at as string).getTime();
      if (age < MIN_SAMPLE_AGE_MS) return null;
    }
    const p = Number(data.price);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

/** Ghi snapshot mới (throttle để không spam DB). Fire-and-forget. */
function recordSnapshot(price: number) {
  const now = Date.now();
  if (now - lastSnapshotAt < SNAPSHOT_MIN_INTERVAL_MS) return;
  lastSnapshotAt = now;
  void supabaseAdmin
    .from("price_history")
    .insert({ symbol: SYMBOL, price })
    .then(() => undefined, () => undefined);
}

async function fetchXau(): Promise<XauPayload> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`xau upstream ${res.status}`);
    const j = (await res.json()) as {
      price?: number;
      bid?: number;
      ask?: number;
      updatedAt?: string;
    };
    const price = Number(j?.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("invalid xau price");
    // gold-api hiện không trả bid/ask — giữ field cho FE để khi upstream đổi
    // hoặc ta swap nguồn, payload không phải đổi shape.
    const bid = Number.isFinite(Number(j?.bid)) ? Number(j!.bid) : null;
    const ask = Number.isFinite(Number(j?.ask)) ? Number(j!.ask) : null;
    const upstreamTs = j?.updatedAt ? Date.parse(j.updatedAt) : NaN;
    const updatedAt = Number.isFinite(upstreamTs) ? upstreamTs : Date.now();
    // % 24h thật: so với mẫu gần ~24h trước trong DB. Nếu chưa có lịch sử
    // (lần chạy đầu / mới deploy), trả 0 — sẽ chính xác sau 24h.
    const prev = await fetchPrice24hAgo();
    const changePct = prev && prev > 0 ? ((price - prev) / prev) * 100 : 0;
    recordSnapshot(price);
    return {
      price,
      bid,
      ask,
      changePct,
      updatedAt,
      unit: UNIT,
      source: { name: "gold-api.com", url: "https://gold-api.com" },
    };
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