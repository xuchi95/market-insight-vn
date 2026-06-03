import { createFileRoute } from "@tanstack/react-router";

/**
 * Lấy dữ liệu cổ phiếu VN từ SSI iBoard (iboard-api.ssi.com.vn) — public, không
 * cần API key, hoạt động ổn từ edge ngoài VN (TCBS apipubaws.* đã 404,
 * VNDIRECT finfo-api geo-block IP nước ngoài).
 *
 * Endpoint:
 *  - OHLC 2 phiên gần nhất:  /statistics/charts/history?resolution=1D&symbol={SYM}&from=...&to=...
 *  - hồ sơ công ty:           /statistics/company/company-profile?symbol={SYM}
 *  - chỉ số tài chính:        /statistics/company/company-statistics?symbol={SYM}
 *
 * Lưu ý: giá trong charts/history ở đơn vị NGÀN VND (vd 60.9 = 60.900 đ/cp);
 * marketCap & EPS trả về ở đơn vị VND nguyên.
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
        referer: "https://iboard.ssi.com.vn/",
        origin: "https://iboard.ssi.com.vn",
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

async function build(symbol: string): Promise<VnStockPayload> {
  const SYM = symbol.toUpperCase();

  const now = Math.floor(Date.now() / 1000);
  const from = now - 30 * 86400; // 30 ngày để đủ lấy 2 phiên gần nhất kể cả nghỉ lễ

  const [chartJson, profileJson, statsJson] = await Promise.all([
    fetchJson(
      `https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=${SYM}&from=${from}&to=${now}`,
    ),
    fetchJson(`https://iboard-api.ssi.com.vn/statistics/company/company-profile?symbol=${SYM}`),
    fetchJson(`https://iboard-api.ssi.com.vn/statistics/company/company-statistics?symbol=${SYM}`),
  ]);

  const chart: any = chartJson?.data ?? null;
  const profile: any = profileJson?.data ?? null;
  const stats: any = statsJson?.data ?? null;

  // SSI charts/history trả về cột song song t/o/h/l/c (đơn vị NGÀN VND).
  const c: number[] = Array.isArray(chart?.c) ? chart.c : [];
  const o: number[] = Array.isArray(chart?.o) ? chart.o : [];
  const h: number[] = Array.isArray(chart?.h) ? chart.h : [];
  const l: number[] = Array.isArray(chart?.l) ? chart.l : [];
  const v: number[] = Array.isArray(chart?.v) ? chart.v : [];
  const lastIdx = c.length - 1;
  const prevIdx = c.length - 2;

  // Quy đổi sang VND/cp (× 1000) cho khớp các trang khác đã dùng VND.
  const toVnd = (x: number | null | undefined) =>
    x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 1000);

  const price = lastIdx >= 0 ? toVnd(c[lastIdx]) : null;
  const prevClose = prevIdx >= 0 ? toVnd(c[prevIdx]) : null;
  const change = price !== null && prevClose !== null ? price - prevClose : null;
  const changePct =
    price !== null && prevClose && prevClose > 0
      ? ((price - prevClose) / prevClose) * 100
      : null;

  // SSI company-statistics: marketCap & EPS đã ở đơn vị VND nguyên;
  // roe/roa/dividendYield trả về dạng tỉ lệ (0.31 = 31%).
  const pe = num(stats?.pe);
  const eps = num(stats?.eps);
  const roeRaw = num(stats?.roe);
  const roaRaw = num(stats?.roa);
  const bvps = num(stats?.bv);
  const pb = num(stats?.pb);
  const mcapVnd = num(stats?.marketCap);
  // Chuẩn hoá: % cho roe/roa, tỉ VND cho marketCap.
  const roe = roeRaw !== null ? roeRaw * 100 : null;
  const roa = roaRaw !== null ? roaRaw * 100 : null;
  const marketCap = mcapVnd !== null ? mcapVnd / 1e9 : null;

  // foundingDate dạng "20/11/2003 00:00:00" → năm thành lập
  let established: number | null = null;
  const fd: string | undefined = profile?.foundingDate;
  if (typeof fd === "string") {
    const m = fd.match(/(\d{4})/);
    if (m) established = Number(m[1]);
  }

  return {
    symbol: SYM,
    companyName: profile?.companyName ?? profile?.companyNameVi ?? profile?.companyNameEn ?? null,
    shortName: profile?.shortName ?? null,
    industry: profile?.sector ?? profile?.industryName ?? profile?.superSector ?? null,
    exchange: profile?.exchange ?? null,
    website: profile?.website ?? profile?.companyWebsite ?? null,
    established,
    employees: num(profile?.numberOfEmployee),
    price,
    prevClose,
    change,
    changePct,
    high: lastIdx >= 0 ? toVnd(h[lastIdx]) : null,
    low: lastIdx >= 0 ? toVnd(l[lastIdx]) : null,
    open: lastIdx >= 0 ? toVnd(o[lastIdx]) : null,
    volume: lastIdx >= 0 && Number.isFinite(v[lastIdx]) ? Math.round(v[lastIdx]) : null,
    pe,
    eps,
    roe,
    roa,
    bvps,
    pb,
    marketCap,
    fetchedAt: Date.now(),
    source: "SSI iBoard (charts/history + company-profile + company-statistics)",
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
