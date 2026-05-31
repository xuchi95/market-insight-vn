import { createFileRoute } from "@tanstack/react-router";

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
  source: "vci" | "vndirect";
}

// Mã chỉ số: vnstock/VCI dùng HNXINDEX/UPCOMINDEX, còn VNDirect dùng HNX/UPCOM.
const INDICES: {
  name: string;
  exchange: string;
  vciCode: string;        // mã trên VCI (vnstock primary source)
  vndirectCode: string;   // mã trên VNDirect (fallback)
}[] = [
  { name: "VN-Index",    exchange: "HOSE",  vciCode: "VNINDEX",    vndirectCode: "VNINDEX" },
  { name: "VN30",        exchange: "HOSE",  vciCode: "VN30",       vndirectCode: "VN30"    },
  { name: "HNX-Index",   exchange: "HNX",   vciCode: "HNXINDEX",   vndirectCode: "HNX"     },
  { name: "HNX30",       exchange: "HNX",   vciCode: "HNX30",      vndirectCode: "HNX30"   },
  { name: "UPCOM-Index", exchange: "UPCOM", vciCode: "UPCOMINDEX", vndirectCode: "UPCOM"   },
];

const CACHE_MS = 5 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 5000;
let cache: { at: number; items: IndexItem[] } | null = null;
let inflight: Promise<IndexItem[]> | null = null;

// ---- Primary: VCI (Vietcap) — đây là nguồn chính vnstock dùng ----
interface VciBar { o: number; h: number; l: number; c: number; v: number; t: number; symbol?: string }

async function fetchVciBatch(symbols: string[]): Promise<Map<string, VciBar[]>> {
  const now = Math.floor(Date.now() / 1000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      "https://trading.vietcap.com.vn/api/chart/OHLCChart/gainers-losers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Referer": "https://trading.vietcap.com.vn/",
          "Origin": "https://trading.vietcap.com.vn",
        },
        body: JSON.stringify({
          timeFrame: "ONE_DAY",
          symbols,
          to: now,
          countBack: 5,
        }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) return new Map();
    const data = (await res.json()) as Array<{
      symbol: string;
      o?: number[]; h?: number[]; l?: number[]; c?: number[]; v?: number[]; t?: number[];
    }>;
    const out = new Map<string, VciBar[]>();
    if (!Array.isArray(data)) return out;
    for (const row of data) {
      const n = row.c?.length ?? 0;
      if (!n) continue;
      const bars: VciBar[] = [];
      for (let i = 0; i < n; i++) {
        bars.push({
          o: row.o?.[i] ?? 0,
          h: row.h?.[i] ?? 0,
          l: row.l?.[i] ?? 0,
          c: row.c?.[i] ?? 0,
          v: row.v?.[i] ?? 0,
          t: row.t?.[i] ?? 0,
        });
      }
      out.set(row.symbol, bars);
    }
    return out;
  } catch {
    return new Map();
  } finally {
    clearTimeout(t);
  }
}

// ---- Fallback: VNDirect dchart ----
interface DchartResponse {
  s: string;
  t?: number[]; c?: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[];
}

async function fetchVndirectOne(code: string): Promise<DchartResponse | null> {
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
  const out: IndexItem[] = [];
  const need = new Set(INDICES.map((i) => i.vciCode));

  // 1) Thử VCI (vnstock primary) trước — 1 request batch cho tất cả chỉ số
  const vci = await fetchVciBatch(INDICES.map((i) => i.vciCode));
  for (const meta of INDICES) {
    const bars = vci.get(meta.vciCode);
    if (!bars || bars.length < 2) continue;
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const change = last.c - prev.c;
    const changePct = prev.c > 0 ? (change / prev.c) * 100 : 0;
    out.push({
      code: meta.vciCode,
      name: meta.name,
      exchange: meta.exchange,
      value: Math.round(last.c * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 1000) / 1000,
      high: last.h || last.c,
      low: last.l || last.c,
      volume: last.v || 0,
      updatedAt: (last.t || Math.floor(Date.now() / 1000)) * 1000,
      source: "vci",
    });
    need.delete(meta.vciCode);
  }

  // 2) Fallback VNDirect cho các mã thiếu
  const missing = INDICES.filter((i) => need.has(i.vciCode));
  if (missing.length) {
    const fb = await Promise.all(missing.map((i) => fetchVndirectOne(i.vndirectCode)));
    fb.forEach((r, idx) => {
      const meta = missing[idx];
      if (!r || r.s !== "ok" || !r.c?.length || r.c.length < 2) return;
      const n = r.c.length;
      const value = r.c[n - 1];
      const prev = r.c[n - 2];
    const change = value - prev;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    out.push({
        code: meta.vciCode,
      name: meta.name,
      exchange: meta.exchange,
      value: Math.round(value * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 1000) / 1000,
      high: r.h?.[n - 1] ?? value,
      low: r.l?.[n - 1] ?? value,
      volume: r.v?.[n - 1] ?? 0,
      updatedAt: (r.t?.[n - 1] ?? Math.floor(Date.now() / 1000)) * 1000,
        source: "vndirect",
    });
  });
  }

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
