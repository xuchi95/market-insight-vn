import { createFileRoute } from "@tanstack/react-router";

interface HistoryPoint { gia_ban: string; gia_mua: string; updated_at: string }
interface HistoryGoldType { name: string; data: HistoryPoint[] }
interface HistoryLocation { name: string; gold_type: HistoryGoldType[] }
interface HistoryResponse { locations?: HistoryLocation[] }

interface SeriesPoint { t: number; v: number }

const CORS = { "Access-Control-Allow-Origin": "*" } as const;
const UPSTREAM_TIMEOUT_MS = 4_000;
const CACHE_MS = 60_000;

// Simple in-memory cache keyed by `${type}-${days}`.
const cache = new Map<string, { at: number; payload: { points: SeriesPoint[] } }>();

function parseVnDate(s: string): number {
  const m = s?.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return Date.now();
  const [, d, mo, y, h, mi, se] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se ?? "00"}+07:00`).getTime();
}

function parseVnNumber(s: string): number {
  if (!s) return 0;
  // "160.500" → 160500 (Vietnamese thousands separator)
  const cleaned = String(s).replace(/\./g, "").replace(/,/g, ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function ymdVN(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 3600_000);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function latestTimestamp(points: SeriesPoint[]): number | undefined {
  if (!points.length) return undefined;
  return Math.max(...points.map((p) => p.t));
}

async function fetchDay(ymd: string, type: string): Promise<SeriesPoint[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price-history?date=${ymd}`,
      { headers: { Accept: "application/json" }, signal: ctrl.signal },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as HistoryResponse;
    const locs = json.locations ?? [];
    const loc =
      locs.find((l) => l.name === "TPHCM" && l.gold_type.some((g) => g.name === type && g.data.length))
      ?? locs.find((l) => l.gold_type.some((g) => g.name === type && g.data.length));
    if (!loc) return [];
    const gt = loc.gold_type.find((g) => g.name === type);
    if (!gt?.data?.length) return [];
    return gt.data.map((p) => {
      const buy = parseVnNumber(p.gia_mua);
      const sell = parseVnNumber(p.gia_ban);
      // ngàn/lượng → VND/chỉ: × 1000 / 10 = × 100
      const mid = ((buy + sell) / 2) * 100;
      return { t: parseVnDate(p.updated_at), v: mid };
    }).filter((p) => p.v > 0);
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/api/public/gold-history")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const type = (url.searchParams.get("type") || "SJC").toUpperCase();
        const daysParam = parseInt(url.searchParams.get("days") || "7", 10);
        const days = Math.max(1, Math.min(60, Number.isFinite(daysParam) ? daysParam : 7));
        const key = `${type}-${days}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_MS) {
          return Response.json(hit.payload, { headers: CORS });
        }
        try {
          const today = new Date();
          // Walk back `days` days (include today).
          const fetches: Promise<SeriesPoint[]>[] = [];
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today.getTime() - i * 86400_000);
            fetches.push(fetchDay(ymdVN(d), type).catch(() => []));
          }
          const chunks = await Promise.all(fetches);
          const points = chunks.flat().sort((a, b) => a.t - b.t);
          // Dedupe identical timestamps.
          const seen = new Set<number>();
          const dedup = points.filter((p) => (seen.has(p.t) ? false : (seen.add(p.t), true)));
          const payload = { points: dedup };
          cache.set(key, { at: Date.now(), payload });
          return Response.json(payload, {
            headers: { "Cache-Control": "public, max-age=60, s-maxage=120", ...CORS },
          });
        } catch (err) {
          return Response.json(
            { error: (err as Error).message, points: [] },
            { status: 502, headers: CORS },
          );
        }
      },
    },
  },
});