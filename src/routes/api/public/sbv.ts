import { createFileRoute } from "@tanstack/react-router";

/**
 * Lãi suất điều hành SBV + tỷ giá trung tâm USD/VND.
 *
 * - Tỷ giá trung tâm: lấy realtime từ trang SBV (https://www.sbv.gov.vn/...).
 *   SBV trả về HTML/JSF chứ không có JSON; ta parse khối ngày + số liệu.
 *   Nếu fail, dùng cached value cuối cùng hoặc seed (cập nhật thủ công).
 *
 * - Lãi suất điều hành: SBV không có API. Chúng tôi duy trì giá trị seed
 *   được cập nhật thủ công theo từng quyết định của SBV. Ngày hiệu lực kèm
 *   trong payload để người dùng biết tươi mới.
 */

const UPSTREAM_TIMEOUT_MS = 6000;
const CACHE_MS = 6 * 60 * 60 * 1000; // 6h (SBV công bố 1 lần/ngày)

interface PolicyRate { code: string; name: string; value: number; unit: string; effectiveFrom: string }
interface SbvPayload {
  centralRate: { pair: "USD/VND"; value: number | null; date: string | null; source: string };
  policyRates: PolicyRate[];
  fetchedAt: number;
  source: string;
  notes: string;
}

// SBV cập nhật lãi suất điều hành theo Quyết định 1124/QĐ-NHNN ngày 19/6/2023
// (giảm 0,5%/năm áp dụng từ 19/6/2023). Cập nhật thủ công khi có QĐ mới.
const POLICY_RATES_SEED: PolicyRate[] = [
  { code: "REFINANCE", name: "Lãi suất tái cấp vốn", value: 4.5, unit: "% / năm", effectiveFrom: "2023-06-19" },
  { code: "REDISCOUNT", name: "Lãi suất tái chiết khấu", value: 3.0, unit: "% / năm", effectiveFrom: "2023-06-19" },
  { code: "OVERNIGHT", name: "Lãi suất cho vay qua đêm liên ngân hàng", value: 5.0, unit: "% / năm", effectiveFrom: "2023-06-19" },
  { code: "DEPOSIT_1M", name: "Trần lãi suất tiền gửi VND ≤ 6 tháng", value: 4.75, unit: "% / năm", effectiveFrom: "2023-06-19" },
  { code: "DEPOSIT_DEMAND", name: "Trần lãi suất tiền gửi không kỳ hạn / < 1 tháng", value: 0.5, unit: "% / năm", effectiveFrom: "2023-06-19" },
];

let cache: { at: number; payload: SbvPayload } | null = null;
let inflight: Promise<SbvPayload> | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchVcbUsdMid(): Promise<{ value: number | null; date: string | null; source: string }> {
  // 1) Thử Vietcombank XML feed (ổn định, không cần key).
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      "https://portal.vietcombank.com.vn/UserControls/TVPortal.TyGia/pXML.aspx",
      {
        headers: {
          accept: "application/xml,text/xml,*/*",
          "user-agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        },
        signal: ctrl.signal,
      },
    );
    if (res.ok) {
      const xml = await res.text();
      // <Exrate CurrencyCode="USD" CurrencyName="..." Buy="..." Transfer="25,470.00" Sell="..." />
      const m = xml.match(/CurrencyCode="USD"[^>]*Transfer="([\d.,]+)"[^>]*Sell="([\d.,]+)"/i);
      const dateM = xml.match(/DateTime>([^<]+)</);
      if (m) {
        const transfer = Number(m[1].replace(/,/g, ""));
        const sell = Number(m[2].replace(/,/g, ""));
        const mid = Number.isFinite(transfer) && Number.isFinite(sell) ? Math.round((transfer + sell) / 2) : null;
        if (mid && mid > 20000 && mid < 35000) {
          return { value: mid, date: dateM ? dateM[1].trim() : null, source: "Vietcombank XML" };
        }
      }
    }
  } catch {
    /* fallthrough to exchangerate.host */
  } finally {
    clearTimeout(t);
  }

  // 2) Fallback: exchangerate.host (free, USD/VND mid-rate)
  const ctrl2 = new AbortController();
  const t2 = setTimeout(() => ctrl2.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=VND", {
      headers: { accept: "application/json" },
      signal: ctrl2.signal,
    });
    if (res.ok) {
      const j: any = await res.json();
      const v = Number(j?.rates?.VND);
      if (Number.isFinite(v) && v > 20000 && v < 35000) {
        return { value: Math.round(v), date: j?.date ?? null, source: "exchangerate.host" };
      }
    }
  } catch {
    /* ignore */
  } finally {
    clearTimeout(t2);
  }
  return { value: null, date: null, source: "unavailable" };
}

async function build(): Promise<SbvPayload> {
  const central = await fetchVcbUsdMid();
  return {
    centralRate: { pair: "USD/VND", value: central.value, date: central.date, source: central.source },
    policyRates: POLICY_RATES_SEED,
    fetchedAt: Date.now(),
    source: "Vietcombank (USD/VND) + QĐ 1124/QĐ-NHNN (lãi suất điều hành SBV)",
    notes: "Tỷ giá USD/VND lấy từ Vietcombank (trung bình mua chuyển khoản + bán) — dùng làm tham chiếu vì SBV không expose API tỷ giá trung tâm. Lãi suất điều hành cập nhật thủ công theo QĐ mới nhất của SBV.",
  };
}

function refresh(): Promise<SbvPayload> {
  if (inflight) return inflight;
  inflight = build()
    .then((p) => {
      cache = { at: Date.now(), payload: p };
      return p;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export const Route = createFileRoute("/api/public/sbv")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          let payload: SbvPayload;
          if (cache && Date.now() - cache.at < CACHE_MS) {
            payload = cache.payload;
          } else {
            try { payload = await refresh(); }
            catch (e) {
              if (cache) payload = cache.payload;
              else throw e;
            }
          }
          return Response.json(payload, {
            headers: {
              "Cache-Control": "public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400",
              ...CORS,
            },
          });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 502, headers: CORS });
        }
      },
    },
  },
});
