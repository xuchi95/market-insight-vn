import { createFileRoute } from "@tanstack/react-router";

/**
 * Lấy dữ liệu cổ phiếu VN từ TCBS public API (apipubaws.tcbs.com.vn).
 * Bao gồm: thông tin công ty, giá hiện tại, các chỉ số tài chính (P/E, EPS, ROE, ROA, BVPS, Market Cap).
 *
 * Endpoint mẫu:
 *  - overview:    /tcanalysis/v1/ticker/{SYM}/overview
 *  - ratio (quý): /tcanalysis/v1/finance/{SYM}/financialratio?yearly=0&isAll=true
 *  - giá:         /stock-insight/v1/stock/second-tc-price?tickers={SYM}
 */

const UPSTREAM_TIMEOUT_MS = 6000;
const CACHE_MS = 5 * 60 * 1000; // 5 phút — giá thay đổi liên tục trong giờ giao dịch
const HARD_CAP_MS = 30 * 60 * 1000;

const SYMBOL_RE = /^[A-Z0-9]{2,8}$/;

interface VnStockPayload {
  symbol: string;
  companyName: string | null;
  shortName: string | null;
  industry: string | null;
  exchange: string | null;
  website: string | null;
  established: number | null;
  employees: number | null;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  volume: number | null;
  pe: number | null;
  eps: number | null;
  roe: number | null;
  roa: number | null;
  bvps: number | null;
  pb: number | null;
  marketCap: number | null; // tỷ VND
  fetchedAt: number;
  source: string;
}

interface CacheEntry { at: number; payload: VnStockPayload }
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<VnStockPayload>>();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchJson(url: string): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        referer: "https://tcinvest.tcbs.com.vn/",
      },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function num(v: any): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

async function build(symbol: string): Promise<VnStockPayload> {
  const SYM = symbol.toUpperCase();

  const [overview, ratios, priceArr] = await Promise.all([
    fetchJson(`https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/${SYM}/overview`),
    fetchJson(`https://apipubaws.tcbs.com.vn/tcanalysis/v1/finance/${SYM}/financialratio?yearly=0&isAll=true`),
    fetchJson(`https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/second-tc-price?tickers=${SYM}`),
  ]);

  const latestRatio: any = Array.isArray(ratios) && ratios.length ? ratios[0] : null;
  const priceRow: any = Array.isArray(priceArr?.data) && priceArr.data.length ? priceArr.data[0] : null;

  const price = num(priceRow?.cp);
  const prevClose = num(priceRow?.rcp);
  const change = price !== null && prevClose !== null ? price - prevClose : null;
  const changePct = price !== null && prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : null;

  return {
    symbol: SYM,
    companyName: overview?.companyName ?? overview?.ticker ?? null,
    shortName: overview?.shortName ?? null,
    industry: overview?.industry ?? overview?.industryEn ?? null,
    exchange: overview?.exchange ?? null,
    website: overview?.website ?? null,
    established: num(overview?.establishedYear),
    employees: num(overview?.noEmployees),
    price,
    prevClose,
    change,
    changePct,
    high: num(priceRow?.hp),
    low: num(priceRow?.lp),
    open: num(priceRow?.op),
    volume: num(priceRow?.totalVol),
    pe: num(latestRatio?.priceToEarning),
    eps: num(latestRatio?.earningPerShare),
    roe: num(latestRatio?.roe),
    roa: num(latestRatio?.roa),
    bvps: num(latestRatio?.bookValuePerShare),
    pb: num(latestRatio?.priceToBook),
    marketCap: num(latestRatio?.marketCap),
    fetchedAt: Date.now(),
    source: "TCBS Public API",
  };
}

function refresh(sym: string): Promise<VnStockPayload> {
  const existing = inflight.get(sym);
  if (existing) return existing;
  const p = build(sym)
    .then((res) => {
      cache.set(sym, { at: Date.now(), payload: res });
      return res;
    })
    .finally(() => inflight.delete(sym));
  inflight.set(sym, p);
  return p;
}

export const Route = createFileRoute("/api/public/vn-stock")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("symbol") ?? "";
        const sym = raw.trim().toUpperCase();
        if (!sym || !SYMBOL_RE.test(sym)) {
          return Response.json(
            { error: "symbol không hợp lệ (chỉ chữ/số, 2-8 ký tự)" },
            { status: 400, headers: CORS },
          );
        }
        try {
          const cached = cache.get(sym);
          let payload: VnStockPayload;
          if (cached && Date.now() - cached.at < CACHE_MS) {
            payload = cached.payload;
          } else {
            try {
              payload = await refresh(sym);
            } catch (e) {
              if (cached && Date.now() - cached.at < HARD_CAP_MS) payload = cached.payload;
              else throw e;
            }
          }
          return Response.json(payload, {
            headers: {
              "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
              ...CORS,
            },
          });
        } catch (err) {
          return Response.json(
            { error: (err as Error).message },
            { status: 502, headers: CORS },
          );
        }
      },
    },
  },
});
