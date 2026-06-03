import { createFileRoute } from "@tanstack/react-router";

/**
 * Lấy lịch sử OHLC cho cổ phiếu VN. Primary: VNDIRECT dchart;
 * fallback: TCBS bars-long-term.
 *
 * Query: ?symbol=VNM&days=90
 * days: 7 | 30 | 90 | 180 | 365
 */

const UPSTREAM_TIMEOUT_MS = 6000;
const CACHE_MS = 5 * 60 * 1000;
const SYMBOL_RE = /^[A-Z0-9]{2,8}$/;
const ALLOWED_DAYS = new Set([7, 30, 90, 180, 365]);

interface Point { t: number; v: number; o?: number; h?: number; l?: number }
interface Payload { symbol: string; days: number; points: Point[]; source: string; fetchedAt: number }

const cache = new Map<string, { at: number; payload: Payload }>();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchVndirect(sym: string, days: number): Promise<Point[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - days * 86400;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const r = await fetch(
      `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${from}&to=${now}`,
      {
        headers: {
          accept: "*/*",
          "user-agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
          referer: "https://dchart.vndirect.com.vn/",
        },
        signal: ctrl.signal,
      },
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    if (j?.s !== "ok" || !Array.isArray(j.t) || !Array.isArray(j.c)) return null;
    const pts: Point[] = [];
    for (let i = 0; i < j.t.length; i++) {
      const v = Number(j.c[i]);
      if (!Number.isFinite(v)) continue;
      pts.push({
        t: Number(j.t[i]) * 1000,
        v,
        o: Number(j.o?.[i]) || undefined,
        h: Number(j.h?.[i]) || undefined,
        l: Number(j.l?.[i]) || undefined,
      });
    }
    return pts.length ? pts : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchTcbs(sym: string, days: number): Promise<Point[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const r = await fetch(
      `https://apipubaws.tcbs.com.vn/stock-insight/v2/stock/bars-long-term?ticker=${sym}&type=stock&resolution=D&to=${now}&countBack=${Math.min(days + 5, 400)}`,
      {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
          referer: "https://tcinvest.tcbs.com.vn/",
        },
        signal: ctrl.signal,
      },
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    const arr: any[] = Array.isArray(j?.data) ? j.data : [];
    if (!arr.length) return null;
    return arr
      .map((row) => ({
        t: new Date(row.tradingDate).getTime(),
        v: Number(row.close),
        o: Number(row.open) || undefined,
        h: Number(row.high) || undefined,
        l: Number(row.low) || undefined,
      }))
      .filter((p) => Number.isFinite(p.v))
      .sort((a, b) => a.t - b.t);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export const Route = createFileRoute("/api/public/vn-stock-chart")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sym = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();
        const days = Number(url.searchParams.get("days") ?? "90");
        if (!SYMBOL_RE.test(sym)) {
          return Response.json({ error: "symbol không hợp lệ" }, { status: 400, headers: CORS });
        }
        if (!ALLOWED_DAYS.has(days)) {
          return Response.json({ error: "days phải là 7, 30, 90, 180 hoặc 365" }, { status: 400, headers: CORS });
        }
        const key = `${sym}:${days}`;
        const cached = cache.get(key);
        if (cached && Date.now() - cached.at < CACHE_MS) {
          return Response.json(cached.payload, {
            headers: { "Cache-Control": "public, max-age=120, s-maxage=300", ...CORS },
          });
        }
        try {
          let pts = await fetchVndirect(sym, days);
          let source = "VNDirect dchart";
          if (!pts) {
            pts = await fetchTcbs(sym, days);
            source = "TCBS bars-long-term";
          }
          if (!pts) throw new Error("Không có dữ liệu OHLC");
          const payload: Payload = { symbol: sym, days, points: pts, source, fetchedAt: Date.now() };
          cache.set(key, { at: Date.now(), payload });
          return Response.json(payload, {
            headers: { "Cache-Control": "public, max-age=120, s-maxage=300", ...CORS },
          });
        } catch (err) {
          if (cached) return Response.json(cached.payload, { headers: CORS });
          return Response.json({ error: (err as Error).message }, { status: 502, headers: CORS });
        }
      },
    },
  },
});
