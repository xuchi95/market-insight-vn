import { createFileRoute } from "@tanstack/react-router";

const CACHE_MS = 60_000;

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
let prevPrice: number | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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
    const changePct = prevPrice && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    prevPrice = price;
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