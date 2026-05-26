import { createFileRoute } from "@tanstack/react-router";

interface VcbRow {
  currencyName: string;
  currencyCode: string;
  cash: string;
  transfer: string;
  sell: string;
}
interface VcbResponse {
  UpdatedDate?: string;
  Date?: string;
  Data?: VcbRow[];
}

interface RateItem {
  code: string;
  name: string;
  cash: number;
  transfer: number;
  sell: number;
  updatedAt: number;
}

const NAME_VI: Record<string, string> = {
  USD: "Đô la Mỹ",
  EUR: "Euro",
  GBP: "Bảng Anh",
  JPY: "Yên Nhật",
  CNY: "Nhân dân tệ",
  KRW: "Won Hàn Quốc",
  SGD: "Đô la Singapore",
  THB: "Baht Thái",
  AUD: "Đô la Úc",
  CAD: "Đô la Canada",
  CHF: "Franc Thuỵ Sĩ",
  HKD: "Đô la Hồng Kông",
  NZD: "Đô la New Zealand",
  MYR: "Ringgit Malaysia",
  DKK: "Krone Đan Mạch",
  NOK: "Krone Na Uy",
  SEK: "Krona Thuỵ Điển",
  RUB: "Rúp Nga",
  KWD: "Dinar Kuwait",
  SAR: "Riyal Ả Rập Xê Út",
  INR: "Rupee Ấn Độ",
  LAK: "Kip Lào",
};

function num(s: string): number {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymdVN(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 3600_000);
  return `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())}`;
}

const CACHE_MS = 10 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 5000;
let cache: { at: number; items: RateItem[]; updatedAt: number } | null = null;
let inflight: Promise<{ items: RateItem[]; updatedAt: number }> | null = null;

async function fetchVcb(ymd: string): Promise<VcbResponse | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://www.vietcombank.com.vn/api/exchangerates?date=${ymd}`,
      { headers: { accept: "application/json" }, signal: ctrl.signal },
    );
    if (!res.ok) return null;
    return (await res.json()) as VcbResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function build(): Promise<{ items: RateItem[]; updatedAt: number }> {
  // Try today; if no data (weekend/holiday) walk back up to 7 days.
  const now = Date.now();
  let json: VcbResponse | null = null;
  for (let i = 0; i <= 7; i++) {
    const d = ymdVN(new Date(now - i * 86400_000));
    const r = await fetchVcb(d);
    if (r?.Data?.length) {
      json = r;
      break;
    }
  }
  if (!json?.Data?.length) throw new Error("VCB no data");

  const updatedAt = json.UpdatedDate
    ? new Date(json.UpdatedDate).getTime()
    : json.Date
      ? new Date(json.Date).getTime()
      : now;

  const items: RateItem[] = json.Data.map((r) => ({
    code: r.currencyCode,
    name: NAME_VI[r.currencyCode] ?? r.currencyName,
    cash: num(r.cash),
    transfer: num(r.transfer),
    sell: num(r.sell),
    updatedAt,
  }));
  return { items, updatedAt };
}

function refresh() {
  if (inflight) return inflight;
  inflight = build()
    .then((res) => {
      cache = { at: Date.now(), items: res.items, updatedAt: res.updatedAt };
      return res;
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

export const Route = createFileRoute("/api/public/bank-rates")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          let items: RateItem[];
          let updatedAt: number;
          if (cache && Date.now() - cache.at < CACHE_MS) {
            items = cache.items;
            updatedAt = cache.updatedAt;
          } else {
            try {
              const res = await refresh();
              items = res.items;
              updatedAt = res.updatedAt;
            } catch (e) {
              if (cache) {
                items = cache.items;
                updatedAt = cache.updatedAt;
              } else throw e;
            }
          }
          return Response.json(
            { items, updatedAt, source: "Vietcombank" },
            {
              headers: {
                "Cache-Control": "public, max-age=120, s-maxage=600, stale-while-revalidate=1800",
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
