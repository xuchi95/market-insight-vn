import { createFileRoute } from "@tanstack/react-router";

// CoinCap v3 asset IDs
const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "tether",
  "binance-coin",
  "solana",
  "xrp",
  "dogecoin",
  "toncoin",
  "cardano",
  "avalanche",
] as const;

const CACHE_MS = 30 * 1000;
let cache: { at: number; payload: any } | null = null;

interface CCAsset {
  id?: string;
  symbol?: string;
  name?: string;
  priceUsd?: string | null;
  marketCapUsd?: string | null;
  volumeUsd24Hr?: string | null;
  changePercent24Hr?: string | null;
}

const FALLBACK_USD_VND = 25_400;

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function buildSparkline(input: number[] | undefined, priceUsd: number): number[] {
  const arr = Array.isArray(input) ? input.filter((n) => Number.isFinite(n)) : [];
  if (arr.length > 0) return arr.slice(-48);
  const base = priceUsd > 0 ? priceUsd : 1;
  return Array.from({ length: 48 }, (_, i) => base * (1 + Math.sin(i / 6) * 0.005));
}

async function fetchUsdVnd(): Promise<number> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!r.ok) throw new Error(String(r.status));
    const j: any = await r.json();
    const v = Number(j?.rates?.VND);
    if (Number.isFinite(v) && v > 0) return v;
  } catch { /* ignore */ }
  return FALLBACK_USD_VND;
}

function ccHeaders() {
  return { accept: "application/json" } as Record<string, string>;
}

function withKey(u: URL | string): string {
  const key = process.env.COINCAP_API_KEY;
  const url = typeof u === "string" ? new URL(u) : u;
  if (key) url.searchParams.set("apiKey", key);
  return url.toString();
}

async function fetchSparkline(id: string, priceUsd: number): Promise<number[]> {
  try {
    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000;
    const u = withKey(`https://rest.coincap.io/v3/assets/${id}/history?interval=h6&start=${start}&end=${end}`);
    const r = await fetch(u, { headers: ccHeaders() });
    if (!r.ok) throw new Error(String(r.status));
    const j: any = await r.json();
    const pts: number[] = Array.isArray(j?.data)
      ? j.data.map((p: any) => Number(p?.priceUsd)).filter((n: number) => Number.isFinite(n))
      : [];
    if (pts.length > 0) return pts;
  } catch { /* ignore */ }
  return buildSparkline(undefined, priceUsd);
}

async function buildPayload() {
  const url = new URL("https://rest.coincap.io/v3/assets");
  url.searchParams.set("ids", COIN_IDS.join(","));

  const [res, usdVnd] = await Promise.all([
    fetch(withKey(url), { headers: ccHeaders() }),
    fetchUsdVnd(),
  ]);
  if (!res.ok) throw new Error(`crypto upstream ${res.status}`);
  const raw: any = await res.json();
  const data: CCAsset[] = Array.isArray(raw?.data) ? raw.data : [];

  const ordered = COIN_IDS
    .map((id) => data.find((m) => m?.id === id))
    .filter((m): m is CCAsset => !!m);

  const base = ordered.map((m) => {
    const id = String(m.id ?? m.symbol ?? "").toLowerCase();
    const symbol = String(m.symbol ?? id).toUpperCase();
    const name = String(m.name ?? symbol);
    const priceUsd = toNum(m.priceUsd, 0);
    return {
      id,
      symbol,
      name,
      image: `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`,
      priceUsd,
      priceVnd: priceUsd * usdVnd,
      change24h: toNum(m.changePercent24Hr, 0),
      marketCap: toNum(m.marketCapUsd, 0),
      volume24h: toNum(m.volumeUsd24Hr, 0),
    };
  });

  const sparks = await Promise.all(base.map((c) => fetchSparkline(c.id, c.priceUsd)));
  const coins = base.map((c, i) => ({ ...c, sparkline: sparks[i] }));

  return { updatedAt: Date.now(), usdVnd, coins };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/crypto")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          if (!cache || Date.now() - cache.at > CACHE_MS) {
            const payload = await buildPayload();
            cache = { at: Date.now(), payload };
          }
          return new Response(JSON.stringify(cache.payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=30",
              ...CORS,
            },
          });
        } catch (e) {
          if (cache) {
            return new Response(JSON.stringify(cache.payload), {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 502,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});