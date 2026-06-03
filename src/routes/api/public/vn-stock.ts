import { createFileRoute } from "@tanstack/react-router";

/**
 * Lấy dữ liệu cổ phiếu VN từ VNDIRECT finfo-api (finfo-api.vndirect.com.vn).
 * Cùng nhà với dchart đã hoạt động ổn, không cần API key. TCBS apipubaws.* đã 404.
 *
 * Endpoint:
 *  - giá lịch sử:   /v4/stock_prices?sort=date:desc&size=2&page=1&q=code:{SYM}
 *  - hồ sơ cty:    /v4/company_profiles?q=code:{SYM}
 *  - thông tin cty: /v4/stocks?q=code:{SYM}
 *  - chỉ số TC:    /v4/ratios/latest?q=code:{SYM}
 */

const UPSTREAM_TIMEOUT_MS = 6000;
const CACHE_MS = 5 * 60 * 1000;
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
        referer: "https://dstock.vndirect.com.vn/",
      },
      signal: ctrl.signal,
    });
    if (!r.ok) {
      console.warn("[vn-stock] upstream not ok", r.status, url);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn("[vn-stock] upstream fetch error", (e as Error).message, url);
    return null;
  } finally {
    clearTimeout(t);
  }
}

function num(v: any): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// VNDIRECT ratios/latest trả về mảng các bản ghi, mỗi bản ghi có
// { code, itemCode, reportDate, value, ratioCode, ... }. Map ratioCode (text)
// hoặc itemCode (number) sang field thân thiện.
function pickRatio(rows: any[], keys: string[]): number | null {
  if (!Array.isArray(rows)) return null;
  for (const r of rows) {
    const k = String(r?.ratioCode ?? r?.itemCode ?? r?.code ?? "").toUpperCase();
    if (keys.some((x) => k === x.toUpperCase())) {
      const v = num(r?.value);
      if (v !== null) return v;
    }
  }
  return null;
}

async function build(symbol: string): Promise<VnStockPayload> {
  const SYM = symbol.toUpperCase();

  const [pricesJson, profileJson, stockJson, ratiosJson] = await Promise.all([
    fetchJson(`https://finfo-api.vndirect.com.vn/v4/stock_prices?sort=date:desc&size=2&page=1&q=code:${SYM}`),
    fetchJson(`https://finfo-api.vndirect.com.vn/v4/company_profiles?q=code:${SYM}`),
    fetchJson(`https://finfo-api.vndirect.com.vn/v4/stocks?q=code:${SYM}`),
    fetchJson(`https://finfo-api.vndirect.com.vn/v4/ratios/latest?q=code:${SYM}`),
  ]);

  const priceRows: any[] = Array.isArray(pricesJson?.data) ? pricesJson.data : [];
  const last = priceRows[0] ?? null;
  const prev = priceRows[1] ?? null;
  const profile: any = Array.isArray(profileJson?.data) && profileJson.data.length ? profileJson.data[0] : null;
  const stock: any = Array.isArray(stockJson?.data) && stockJson.data.length ? stockJson.data[0] : null;
  const ratios: any[] = Array.isArray(ratiosJson?.data) ? ratiosJson.data : [];

  // Giá VNDIRECT đã ở đơn vị VND/cp (vd VNM ~ 70000). Đôi khi field "close" là
  // adjusted close — ưu tiên `close`, fallback `adClose` / `basicPrice`.
  const price = num(last?.close) ?? num(last?.adClose) ?? num(last?.basicPrice);
  const prevCloseRaw =
    num(last?.basicPrice) ?? // tham chiếu phiên hiện tại
    num(prev?.close) ??
    num(prev?.adClose);
  const prevClose = prevCloseRaw;
  const change =
    num(last?.change) ?? (price !== null && prevClose !== null ? price - prevClose : null);
  const changePct =
    num(last?.pctChange) ??
    (price !== null && prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : null);

  return {
    symbol: SYM,
    companyName: profile?.companyName ?? stock?.companyName ?? stock?.companyNameEng ?? null,
    shortName: stock?.shortName ?? profile?.shortName ?? null,
    industry: profile?.industryName ?? stock?.industryName ?? profile?.industryLevel2 ?? null,
    exchange: stock?.floor ?? last?.floor ?? profile?.floor ?? null,
    website: profile?.companyWebsite ?? profile?.website ?? null,
    established: num(profile?.establishedYear) ?? num(profile?.foundingDate?.slice?.(0, 4)),
    employees: num(profile?.noEmployees) ?? num(profile?.totalEmployees),
    price,
    prevClose,
    change,
    changePct,
    high: num(last?.high) ?? num(last?.adHigh),
    low: num(last?.low) ?? num(last?.adLow),
    open: num(last?.open) ?? num(last?.adOpen),
    volume: num(last?.nmVolume) ?? num(last?.totalMatchVol) ?? num(last?.accumulatedVol),
    pe: pickRatio(ratios, ["PE", "PRICE_TO_EARNINGS", "51003"]),
    eps: pickRatio(ratios, ["EPS", "BASIC_EPS", "52006", "52001"]),
    roe: pickRatio(ratios, ["ROE", "53001"]),
    roa: pickRatio(ratios, ["ROA", "53002"]),
    bvps: pickRatio(ratios, ["BVPS", "BOOK_VALUE_PER_SHARE", "52007"]),
    pb: pickRatio(ratios, ["PB", "PRICE_TO_BOOK", "51006"]),
    marketCap: pickRatio(ratios, ["MARKETCAP", "MARKET_CAP", "51001"]),
    fetchedAt: Date.now(),
    source: "VNDIRECT finfo-api",
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
