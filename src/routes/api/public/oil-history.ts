import { createFileRoute } from "@tanstack/react-router";
import { requireRequestUser } from "@/lib/api/require-request-user.server";

// Lịch sử giá dầu (Brent/WTI) từ Yahoo Finance.
// GET /api/public/oil-history?id=brent|wti&days=1|7|30|90
const UPSTREAM_TIMEOUT_MS = 6000;

const SYMBOLS: Record<string, string> = {
  brent: "BZ=F",
  wti: "CL=F",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type Point = { t: number; v: number };

function pickInterval(days: number): { range: string; interval: string } {
  if (days <= 1) return { range: "1d", interval: "5m" };
  if (days <= 7) return { range: "7d", interval: "60m" };
  if (days <= 30) return { range: "1mo", interval: "1d" };
  return { range: "3mo", interval: "1d" };
}

// in-memory cache theo (id, days)
const cache = new Map<string, { at: number; points: Point[] }>();
const CACHE_MS = 5 * 60_000;

async function fetchHistory(id: string, days: number): Promise<Point[]> {
  const sym = SYMBOLS[id];
  if (!sym) return [];
  const { range, interval } = pickInterval(days);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const j: any = await res.json();
    const r = j?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const points: Point[] = [];
    for (let i = 0; i < ts.length; i++) {
      const v = closes[i];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        points.push({ t: ts[i] * 1000, v: Math.round(v * 100) / 100 });
      }
    }
    return points;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export const Route = createFileRoute("/api/public/oil-history")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const guard = await requireRequestUser(request);
        if (guard) return guard;
        const url = new URL(request.url);
        const id = (url.searchParams.get("id") ?? "").toLowerCase();
        const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") ?? "7") || 7));
        if (!SYMBOLS[id]) {
          return new Response(JSON.stringify({ error: "invalid id", points: [] }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const key = `${id}:${days}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_MS) {
          return new Response(JSON.stringify({ points: hit.points, updatedAt: hit.at }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...CORS },
          });
        }
        const points = await fetchHistory(id, days);
        if (points.length === 0 && hit) {
          return new Response(JSON.stringify({ points: hit.points, updatedAt: hit.at }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        cache.set(key, { at: Date.now(), points });
        return new Response(JSON.stringify({ points, updatedAt: Date.now() }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...CORS },
        });
      },
    },
  },
});