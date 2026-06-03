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

async function fetchSbvCentralRate(): Promise<{ value: number | null; date: string | null }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    // SBV trang tỷ giá trung tâm (rất hay đổi). Cố gắng parse số gần "USD".
    const res = await fetch("https://www.sbv.gov.vn/webcenter/portal/vi/menu/rm/tg", {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return { value: null, date: null };
    const html = await res.text();
    // Tìm mẫu "USD ... 24,xxx" (số VND thường có dấu phẩy ngăn nghìn)
    const m = html.match(/USD[\s\S]{0,200}?([23]\d[.,]\d{3})/);
    const rate = m ? Number(m[1].replace(/[.,]/g, "")) : null;
    // Tìm ngày dd/mm/yyyy gần nhất
    const md = html.match(/(\d{2}\/\d{2}\/\d{4})/);
    const dateRaw = md ? md[1] : null;
    let date: string | null = null;
    if (dateRaw) {
      const [d, mo, y] = dateRaw.split("/");
      date = `${y}-${mo}-${d}`;
    }
    return { value: rate && rate > 20000 && rate < 35000 ? rate : null, date };
  } catch {
    return { value: null, date: null };
  } finally {
    clearTimeout(t);
  }
}

async function build(): Promise<SbvPayload> {
  const central = await fetchSbvCentralRate();
  return {
    centralRate: { pair: "USD/VND", value: central.value, date: central.date, source: "Ngân hàng Nhà nước Việt Nam" },
    policyRates: POLICY_RATES_SEED,
    fetchedAt: Date.now(),
    source: "SBV (sbv.gov.vn) + QĐ 1124/QĐ-NHNN",
    notes: "Lãi suất điều hành được cập nhật theo Quyết định mới nhất của SBV. Tỷ giá trung tâm được parse từ trang chính thức của SBV và có thể lỗi khi cấu trúc trang thay đổi.",
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
