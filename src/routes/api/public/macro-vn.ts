import { createFileRoute } from "@tanstack/react-router";

interface MacroPoint { year: number; value: number }
interface MacroIndicator {
  code: string;
  name: string;
  unit: string;
  latest?: MacroPoint;
  previous?: MacroPoint;
  history: MacroPoint[]; // ascending by year
}
interface MacroPayload {
  country: string;
  indicators: MacroIndicator[];
  fetchedAt: number;
  source: string;
}

// Each entry: World Bank code + Vietnamese name + display unit
const INDICATORS: { code: string; name: string; unit: string }[] = [
  { code: "NY.GDP.MKTP.KD.ZG", name: "Tăng trưởng GDP",            unit: "% / năm" },
  { code: "FP.CPI.TOTL.ZG",   name: "Lạm phát (CPI)",              unit: "% / năm" },
  { code: "SL.UEM.TOTL.ZS",   name: "Tỷ lệ thất nghiệp",           unit: "% lao động" },
  { code: "FR.INR.LEND",      name: "Lãi suất cho vay bình quân",  unit: "% / năm" },
  { code: "FI.RES.TOTL.CD",   name: "Dự trữ ngoại hối",            unit: "USD" },
  { code: "NE.EXP.GNFS.CD",   name: "Kim ngạch xuất khẩu",         unit: "USD" },
  { code: "NE.IMP.GNFS.CD",   name: "Kim ngạch nhập khẩu",         unit: "USD" },
  { code: "NY.GDP.MKTP.CD",   name: "GDP danh nghĩa",              unit: "USD" },
];

const CACHE_MS = 24 * 60 * 60 * 1000; // 24h — annual data
const UPSTREAM_TIMEOUT_MS = 7000;
let cache: { at: number; payload: MacroPayload } | null = null;
let inflight: Promise<MacroPayload> | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchIndicator(code: string, name: string, unit: string): Promise<MacroIndicator> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const currentYear = new Date().getUTCFullYear();
    const url = `https://api.worldbank.org/v2/country/VN/indicator/${code}?format=json&date=${currentYear - 14}:${currentYear}&per_page=50`;
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`worldbank ${code} ${res.status}`);
    const j: any = await res.json();
    const rows: any[] = Array.isArray(j) && Array.isArray(j[1]) ? j[1] : [];
    const history: MacroPoint[] = rows
      .map((r) => ({ year: Number(r.date), value: typeof r.value === "number" ? r.value : NaN }))
      .filter((p) => Number.isFinite(p.value))
      .sort((a, b) => a.year - b.year);
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    return { code, name, unit, latest, previous, history };
  } finally {
    clearTimeout(t);
  }
}

async function buildPayload(): Promise<MacroPayload> {
  // Parallel — World Bank API tolerates concurrent calls and 8 small responses are cheap.
  const results = await Promise.allSettled(
    INDICATORS.map((i) => fetchIndicator(i.code, i.name, i.unit)),
  );
  const indicators: MacroIndicator[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") indicators.push(r.value);
    else indicators.push({ ...INDICATORS[i], history: [] });
  }
  return {
    country: "Việt Nam",
    indicators,
    fetchedAt: Date.now(),
    source: "World Bank Open Data",
  };
}

function refresh(): Promise<MacroPayload> {
  if (inflight) return inflight;
  inflight = buildPayload()
    .then((p) => {
      cache = { at: Date.now(), payload: p };
      return p;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const Route = createFileRoute("/api/public/macro-vn")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          let payload: MacroPayload;
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
              "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
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