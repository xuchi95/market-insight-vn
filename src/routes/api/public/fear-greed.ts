import { createFileRoute } from "@tanstack/react-router";

interface FngPoint { value: number; classification: string; timestamp: number }
interface FngPayload {
  current: FngPoint;
  yesterday?: FngPoint;
  lastWeek?: FngPoint;
  lastMonth?: FngPoint;
  history: FngPoint[]; // newest first, up to 30
  nextUpdateSec?: number;
  fetchedAt: number;
  source: string;
}

const CACHE_MS = 30 * 60 * 1000; // refresh twice/hour — upstream updates daily
const UPSTREAM_TIMEOUT_MS = 6000;
let cache: { at: number; payload: FngPayload } | null = null;
let inflight: Promise<FngPayload> | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchFng(): Promise<FngPayload> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=30", {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`alternative.me ${res.status}`);
    const j: any = await res.json();
    const raw: any[] = Array.isArray(j?.data) ? j.data : [];
    if (raw.length === 0) throw new Error("empty fng");
    const history: FngPoint[] = raw
      .map((d) => ({
        value: Number(d.value),
        classification: String(d.value_classification ?? ""),
        timestamp: Number(d.timestamp) * 1000,
      }))
      .filter((p) => Number.isFinite(p.value));
    return {
      current: history[0],
      yesterday: history[1],
      lastWeek: history[6],
      lastMonth: history[29] ?? history[history.length - 1],
      history,
      nextUpdateSec: Number(raw[0]?.time_until_update) || undefined,
      fetchedAt: Date.now(),
      source: "alternative.me",
    };
  } finally {
    clearTimeout(t);
  }
}

function refresh(): Promise<FngPayload> {
  if (inflight) return inflight;
  inflight = fetchFng()
    .then((p) => {
      cache = { at: Date.now(), payload: p };
      return p;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const Route = createFileRoute("/api/public/fear-greed")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          let payload: FngPayload;
          if (cache && Date.now() - cache.at < CACHE_MS) {
            payload = cache.payload;
          } else {
            try {
              payload = await refresh();
            } catch (e) {
              if (cache) payload = cache.payload;
              else throw e;
            }
          }
          return Response.json(payload, {
            headers: {
              "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600",
              ...CORS,
            },
          });
        } catch (e) {
          return Response.json(
            { error: (e as Error).message },
            { status: 502, headers: CORS },
          );
        }
      },
    },
  },
});