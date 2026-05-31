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

/**
 * Two upstream sources:
 *  - IMF WEO (datamapper API): includes current-year estimates and short-term forecasts (2025+).
 *  - World Bank Open Data: better coverage for trade, reserves, lending rate — but trails by ~1 year.
 *
 * For each indicator we pick the source with the most current published number for Vietnam.
 */
type Source = "imf" | "wb";
interface IndicatorDef {
  code: string;          // stable id used by the client
  name: string;
  unit: string;
  source: Source;
  imfCode?: string;      // WEO indicator code
  wbCode?: string;       // World Bank indicator code
  scale?: number;        // multiplier (e.g. IMF NGDPD is in billion USD → ×1e9)
}
const INDICATORS: IndicatorDef[] = [
  { code: "NY.GDP.MKTP.KD.ZG", name: "Tăng trưởng GDP",            unit: "% / năm",   source: "imf", imfCode: "NGDP_RPCH" },
  { code: "FP.CPI.TOTL.ZG",    name: "Lạm phát (CPI)",              unit: "% / năm",   source: "imf", imfCode: "PCPIPCH" },
  { code: "SL.UEM.TOTL.ZS",    name: "Tỷ lệ thất nghiệp",           unit: "% lao động",source: "imf", imfCode: "LUR" },
  { code: "FR.INR.LEND",       name: "Lãi suất cho vay bình quân",  unit: "% / năm",   source: "wb",  wbCode: "FR.INR.LEND" },
  { code: "FI.RES.TOTL.CD",    name: "Dự trữ ngoại hối",            unit: "USD",       source: "wb",  wbCode: "FI.RES.TOTL.CD" },
  { code: "NE.EXP.GNFS.CD",    name: "Kim ngạch xuất khẩu",         unit: "USD",       source: "wb",  wbCode: "NE.EXP.GNFS.CD" },
  { code: "NE.IMP.GNFS.CD",    name: "Kim ngạch nhập khẩu",         unit: "USD",       source: "wb",  wbCode: "NE.IMP.GNFS.CD" },
  { code: "NY.GDP.MKTP.CD",    name: "GDP danh nghĩa",              unit: "USD",       source: "imf", imfCode: "NGDPD", scale: 1e9 },
];

const CACHE_MS = 24 * 60 * 60 * 1000; // 24h — annual data
const UPSTREAM_TIMEOUT_MS = 7000;
let cache: { at: number; payload: MacroPayload } | null = null;
let inflight: Promise<MacroPayload> | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function withTimeout(): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

function pack(def: IndicatorDef, history: MacroPoint[]): MacroIndicator {
  history.sort((a, b) => a.year - b.year);
  return {
    code: def.code,
    name: def.name,
    unit: def.unit,
    latest: history[history.length - 1],
    previous: history[history.length - 2],
    history,
  };
}

async function fetchFromWorldBank(def: IndicatorDef): Promise<MacroIndicator> {
  const { signal, cancel } = withTimeout();
  try {
    const currentYear = new Date().getUTCFullYear();
    const url = `https://api.worldbank.org/v2/country/VN/indicator/${def.wbCode}?format=json&date=${currentYear - 14}:${currentYear}&per_page=50`;
    const res = await fetch(url, { headers: { accept: "application/json" }, signal });
    if (!res.ok) throw new Error(`worldbank ${def.wbCode} ${res.status}`);
    const j: any = await res.json();
    const rows: any[] = Array.isArray(j) && Array.isArray(j[1]) ? j[1] : [];
    const history: MacroPoint[] = rows
      .map((r) => ({ year: Number(r.date), value: typeof r.value === "number" ? r.value : NaN }))
      .filter((p) => Number.isFinite(p.value));
    return pack(def, history);
  } finally {
    cancel();
  }
}

async function fetchFromIMF(def: IndicatorDef): Promise<MacroIndicator> {
  const { signal, cancel } = withTimeout();
  try {
    // IMF WEO publishes estimates + short-term forecasts. We only keep data up to
    // the current year so we never show speculative forecast values (e.g. 2027+).
    const currentYear = new Date().getUTCFullYear();
    const startYear = currentYear - 14;
    const url = `https://www.imf.org/external/datamapper/api/v1/${def.imfCode}/VNM`;
    const res = await fetch(url, { headers: { accept: "application/json" }, signal });
    if (!res.ok) throw new Error(`imf ${def.imfCode} ${res.status}`);
    const j: any = await res.json();
    const series: Record<string, number> | undefined = j?.values?.[def.imfCode!]?.VNM;
    if (!series) throw new Error(`imf ${def.imfCode} missing VNM series`);
    const scale = def.scale ?? 1;
    const history: MacroPoint[] = Object.entries(series)
      .map(([y, v]) => ({ year: Number(y), value: typeof v === "number" ? v * scale : NaN }))
      .filter((p) => Number.isFinite(p.value) && p.year >= startYear && p.year <= currentYear);
    return pack(def, history);
  } finally {
    cancel();
  }
}

async function fetchIndicator(def: IndicatorDef): Promise<MacroIndicator> {
  if (def.source === "imf") {
    try {
      return await fetchFromIMF(def);
    } catch (e) {
      // Fall back to World Bank using the same conceptual code when possible.
      if (def.wbCode) return fetchFromWorldBank(def);
      throw e;
    }
  }
  return fetchFromWorldBank(def);
}

async function buildPayload(): Promise<MacroPayload> {
  const results = await Promise.allSettled(INDICATORS.map((d) => fetchIndicator(d)));
  const indicators: MacroIndicator[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") indicators.push(r.value);
    else {
      const d = INDICATORS[i];
      indicators.push({ code: d.code, name: d.name, unit: d.unit, history: [] });
    }
  }
  return {
    country: "Việt Nam",
    indicators,
    fetchedAt: Date.now(),
    source: "IMF WEO + World Bank Open Data",
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
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const forceRefresh = url.searchParams.get("refresh") === "1";
          let payload: MacroPayload;
          if (!forceRefresh && cache && Date.now() - cache.at < CACHE_MS) {
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