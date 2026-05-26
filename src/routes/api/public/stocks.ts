import { createFileRoute } from "@tanstack/react-router";

interface DchartResponse {
  s: string;
  t?: number[];
  c?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  v?: number[];
}

interface IndexItem {
  code: string;
  name: string;
  exchange: string;
  value: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  updatedAt: number;
}

const INDICES: { code: string; name: string; exchange: string }[] = [
  { code: "VNINDEX", name: "VN-Index", exchange: "HOSE" },
  { code: "VN30",    name: "VN30",     exchange: "HOSE" },
  { code: "HNX",     name: "HNX-Index",exchange: "HNX"  },
  { code: "HNX30",   name: "HNX30",    exchange: "HNX"  },
  { code: "UPCOM",   name: "UPCOM-Index", exchange: "UPCOM" },
];

const CACHE_MS = 5 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 5000;
let cache: { at: number; items: IndexItem[] } | null = null;
let inflight: Promise<IndexItem[]> | null = null;

async function fetchOne(code: string): Promise<DchartResponse | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 14 * 86400;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://dchart-api.vndirect.com.vn/dchart/history?resolution=1D&symbol=${code}&from=${from}&to=${now}`,
      {
        headers: {
          "Accept": "*/*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Referer": "https://dchart.vndirect.com.vn/",
          "Origin": "https://dchart.vndirect.com.vn",
        },
        signal: ctrl.signal,
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as DchartResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function buildItems(): Promise<IndexItem[]> {
  const results = await Promise.all(INDICES.map((i) => fetchOne(i.code)));
  const out: IndexItem[] = [];
  results.forEach((r, idx) => {
    const meta = INDICES[idx];
    if (!r || r.s !== "ok" || !r.c?.length || r.c.length < 2) return;
    const n = r.c.length;
    const value = r.c[n - 1];
    const prev = r.c[n - 2];
    const change = value - prev;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    out.push({
      code: meta.code,
      name: meta.name,
      exchange: meta.exchange,
      value: Math.round(value * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 1000) / 1000,
      high: r.h?.[n - 1] ?? value,
      low: r.l?.[n - 1] ?? value,
      volume: r.v?.[n - 1] ?? 0,
      updatedAt: (r.t?.[n - 1] ?? Math.floor(Date.now() / 1000)) * 1000,
    });
  });
  return out;
}

function refresh(): Promise<IndexItem[]> {
  if (inflight) return inflight;
  inflight = buildItems()
    .then((items) => {
      if (items.length) cache = { at: Date.now(), items };
      return items;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/stocks")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          let items: IndexItem[];
          if (cache && Date.now() - cache.at < CACHE_MS) {
            items = cache.items;
          } else {
            try {
              items = await refresh();
              if (!items.length && cache) items = cache.items;
            } catch {
              if (cache) items = cache.items;
              else throw new Error("Stocks upstream unavailable");
            }
          }
          return Response.json(
            { items, fetchedAt: Date.now() },
            {
              headers: {
                "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
                ...CORS,
              },
            },
          );
        } catch (err) {
          return Response.json(
            { error: (err as Error).message, items: [] },
            { status: 502, headers: CORS },
          );
        }
      },
    },
  },
});
