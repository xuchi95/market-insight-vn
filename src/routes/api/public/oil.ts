import { createFileRoute } from "@tanstack/react-router";

// Giá dầu thô — Brent (ICE) & WTI (NYMEX), lấy từ Yahoo Finance.
// Cache server-side 60s để cân bằng "realtime cảm giác" vs upstream rate-limit.
const CACHE_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 5000;

type OilSym = "BZ=F" | "CL=F";

const META: Record<OilSym, { id: string; name: string; nameVi: string; exchange: string }> = {
  "BZ=F": { id: "brent", name: "Brent Crude", nameVi: "Dầu Brent", exchange: "ICE" },
  "CL=F": { id: "wti", name: "WTI Crude", nameVi: "Dầu WTI", exchange: "NYMEX" },
};

interface OilItem {
  id: string;
  symbol: OilSym;
  name: string;
  nameVi: string;
  exchange: string;
  priceUsd: number;       // USD/thùng (barrel)
  prevClose: number;
  changeAbs: number;      // USD
  changePct: number;      // %
  updatedAt: number;      // epoch ms
}

let cache: { at: number; items: OilItem[] } | null = null;
let inflight: Promise<OilItem[]> | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchYahoo(symbol: OilSym): Promise<OilItem | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const result = j?.chart?.result?.[0];
    const meta = result?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prevClose = Number.isFinite(prev) && prev > 0 ? prev : price;
    const changeAbs = price - prevClose;
    const changePct = prevClose > 0 ? (changeAbs / prevClose) * 100 : 0;
    const tsSec = Number(meta?.regularMarketTime);
    const updatedAt = Number.isFinite(tsSec) && tsSec > 0 ? tsSec * 1000 : Date.now();
    const m = META[symbol];
    return {
      id: m.id,
      symbol,
      name: m.name,
      nameVi: m.nameVi,
      exchange: m.exchange,
      priceUsd: Math.round(price * 100) / 100,
      prevClose: Math.round(prevClose * 100) / 100,
      changeAbs: Math.round(changeAbs * 100) / 100,
      changePct: Math.round(changePct * 1000) / 1000,
      updatedAt,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function refresh(): Promise<OilItem[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const results = await Promise.all([fetchYahoo("BZ=F"), fetchYahoo("CL=F")]);
      const items = results.filter((x): x is OilItem => x !== null);
      if (items.length === 0) {
        if (cache) return cache.items;
        throw new Error("oil upstream empty");
      }
      cache = { at: Date.now(), items };
      return items;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export const Route = createFileRoute("/api/public/oil")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          if (!cache || Date.now() - cache.at > CACHE_MS) {
            await refresh();
          }
          return new Response(
            JSON.stringify({ items: cache!.items, updatedAt: cache!.at }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=60",
                ...CORS,
              },
            },
          );
        } catch (e) {
          if (cache) {
            return new Response(
              JSON.stringify({ items: cache.items, updatedAt: cache.at }),
              { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }
          return new Response(
            JSON.stringify({ error: (e as Error).message, items: [] }),
            { status: 502, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      },
    },
  },
});