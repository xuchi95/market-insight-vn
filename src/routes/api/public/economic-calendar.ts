import { createFileRoute } from "@tanstack/react-router";
import { ECONOMIC_EVENTS, type EconAffects, type EconImpact, type EconomicEvent } from "@/lib/data/economicCalendar";

const CACHE_MS = 3 * 60 * 60 * 1000; // 3h
const UPSTREAM_TIMEOUT_MS = 8000;
type CalendarSource = "fmp" | "forexfactory" | "reference";
let cache: { at: number; items: EconomicEvent[]; source: CalendarSource } | null = null;
let inflight: Promise<{ items: EconomicEvent[]; source: CalendarSource }> | null = null;

const COUNTRY_NAMES: Record<string, string> = {
  US: "Hoa Kỳ", EU: "Eurozone", DE: "Đức", FR: "Pháp", IT: "Ý", ES: "Tây Ban Nha",
  GB: "Anh Quốc", UK: "Anh Quốc", JP: "Nhật Bản", CN: "Trung Quốc", VN: "Việt Nam",
  KR: "Hàn Quốc", IN: "Ấn Độ", AU: "Úc", CA: "Canada", CH: "Thụy Sĩ",
  HK: "Hồng Kông", SG: "Singapore", TH: "Thái Lan", ID: "Indonesia",
  MY: "Malaysia", PH: "Philippines", TW: "Đài Loan", BR: "Brazil",
  MX: "Mexico", RU: "Nga", ZA: "Nam Phi", TR: "Thổ Nhĩ Kỳ", NZ: "New Zealand",
  SE: "Thụy Điển", NO: "Na Uy", DK: "Đan Mạch", PL: "Ba Lan",
};

// FMP uses "USD"/"EUR" sometimes — normalise to ISO-2 country code
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", CNY: "CN", AUD: "AU",
  CAD: "CA", CHF: "CH", NZD: "NZ", KRW: "KR", INR: "IN", HKD: "HK",
  SGD: "SG", VND: "VN", THB: "TH", IDR: "ID", MYR: "MY", TWD: "TW",
  BRL: "BR", MXN: "MX", RUB: "RU", ZAR: "ZA", TRY: "TR", SEK: "SE",
  NOK: "NO", DKK: "DK", PLN: "PL",
};

function normCountry(raw: string | undefined): string {
  if (!raw) return "";
  const u = raw.toUpperCase();
  if (COUNTRY_NAMES[u]) return u;
  if (CURRENCY_TO_COUNTRY[u]) return CURRENCY_TO_COUNTRY[u];
  return u.slice(0, 2);
}

function normImpact(raw: unknown): EconImpact {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("high")) return "high";
  if (s.includes("medium") || s.includes("mid")) return "medium";
  return "low";
}

function inferAffects(country: string, eventName: string): EconAffects[] {
  const set = new Set<EconAffects>();
  const e = eventName.toLowerCase();
  // Currency from country
  if (country === "US") set.add("usd");
  if (country === "VN") set.add("vnd");
  // Event keywords
  if (/cpi|inflation|ppi|pce|fed|fomc|interest rate|rate decision|nfp|nonfarm|payroll|unemployment|jobless|gdp/i.test(eventName)) {
    if (country === "US") {
      set.add("gold"); set.add("usd"); set.add("stocks");
      if (/fed|fomc|rate|cpi|inflation/.test(e)) set.add("btc");
    } else {
      set.add("gold");
    }
  }
  if (/retail|consumer|manufacturing|pmi|ism/i.test(eventName)) set.add("stocks");
  if (country === "CN" && /gdp|cpi|pmi|retail|trade/i.test(eventName)) set.add("stocks");
  if (set.size === 0) set.add(country === "US" ? "usd" : "stocks");
  return Array.from(set);
}

function fmtValue(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return v.toLocaleString("en-US");
    return String(v);
  }
  return String(v);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toIsoUtc(rawDate: string): string {
  // FMP returns "YYYY-MM-DD HH:mm:ss" (UTC). Normalise to ISO.
  if (!rawDate) return new Date().toISOString();
  if (rawDate.includes("T")) return new Date(rawDate).toISOString();
  return rawDate.replace(" ", "T") + "Z";
}

async function fetchFromFmp(): Promise<EconomicEvent[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error("FMP_API_KEY is not configured");

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86400_000);
  const to = new Date(now.getTime() + 45 * 86400_000);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${ymd(from)}&to=${ymd(to)}&apikey=${apiKey}`;
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("FMP: unexpected response shape");

    const items: EconomicEvent[] = [];
    for (const r of data as Array<Record<string, unknown>>) {
      const country = normCountry(String(r.country ?? r.currency ?? ""));
      if (!country) continue;
      const eventName = String(r.event ?? "").trim();
      if (!eventName) continue;
      const datetime = toIsoUtc(String(r.date ?? ""));
      const impact = normImpact(r.impact);
      const id = `${country}-${eventName}-${datetime}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .slice(0, 120);
      items.push({
        id,
        datetime,
        country,
        countryName: COUNTRY_NAMES[country] ?? country,
        event: eventName,
        impact,
        previous: fmtValue(r.previous),
        forecast: fmtValue(r.estimate ?? r.forecast),
        actual: fmtValue(r.actual),
        affects: inferAffects(country, eventName),
      });
    }
    // Sort ascending by time
    items.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return items;
  } finally {
    clearTimeout(t);
  }
}

function refresh(): Promise<EconomicEvent[]> {
  if (inflight) return inflight;
  inflight = fetchFromFmp()
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

export const Route = createFileRoute("/api/public/economic-calendar")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          let items: EconomicEvent[];
          let stale = false;
          if (cache && Date.now() - cache.at < CACHE_MS) {
            items = cache.items;
          } else {
            try {
              items = await refresh();
              if (!items.length && cache) {
                items = cache.items;
                stale = true;
              }
            } catch (err) {
              if (cache) {
                items = cache.items;
                stale = true;
              } else {
                throw err;
              }
            }
          }
          return Response.json(
            { items, fetchedAt: cache?.at ?? Date.now(), stale, source: "fmp" },
            {
              headers: {
                "Cache-Control": "public, max-age=300, s-maxage=10800, stale-while-revalidate=86400",
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
