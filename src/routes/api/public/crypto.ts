import { createFileRoute } from "@tanstack/react-router";
import { readPriceCache, writePriceCache } from "@/lib/price-cache.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPriceChangeConfig } from "@/lib/price-change-config.server";

// CoinGecko coin IDs (public free API, no key required, ~30 req/min)
const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "tether",
  "binancecoin",
  "solana",
  "ripple",
  "dogecoin",
  "the-open-network",
  "cardano",
  "avalanche-2",
  "tron",
  "chainlink",
  "polkadot",
  "polygon-ecosystem-token",
  "shiba-inu",
  "litecoin",
  "bitcoin-cash",
  "uniswap",
  "stellar",
  "near",
  "internet-computer",
  "aptos",
  "cosmos",
  "monero",
  "ethereum-classic",
  "filecoin",
  "hedera-hashgraph",
  "arbitrum",
  "vechain",
  "maker",
  "render-token",
  "injective-protocol",
  "optimism",
  "sui",
  "pepe",
  "usd-coin",
  "dai",
  "wrapped-bitcoin",
  "leo-token",
  "kaspa",
  // Alts mới được cộng đồng yêu cầu thêm
  "ethena",
  "worldcoin-wld",
  "sei-network",
  "fetch-ai",
  "jupiter-exchange-solana",
  "pyth-network",
  "aave",
  "ondo-finance",
  "celestia",
  "official-trump",
  // Memecoins
  "bonk",
  "floki",
  "dogwifcoin",
  "book-of-meme",
  "notcoin",
] as const;

// Free CoinGecko data refreshes every ~30-60s upstream. Re-poll often enough
// to feel realtime while staying well under the public rate limit.
// CoinGecko base (marketCap, sparkline, metadata) refreshes every 60s — live
// price comes from the Binance overlay below.
const CACHE_FRESH_MS = 60 * 1000;
const CACHE_SWR_MS = 5 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 6_000;
let cache: { at: number; payload: any } | null = null;
let inflight: Promise<any> | null = null;

// === 24h % change DB fallback (mirrors gold.ts) ==========================
// Khi upstream (CoinGecko / Binance) trả `change24h` thiếu hoặc bằng 0,
// rơi về `price_history` thông qua RPC `closest_price_samples` —
// dùng chung covering index `price_history_symbol_time_price_idx`
// `(symbol, captured_at DESC) INCLUDE (price)` đã có sẵn từ gold/forex.
const WINDOW_MS = 24 * 60 * 60 * 1000;
const SYMBOL_PREFIX = "CRYPTO:";
const CHANGE_PCT_TTL_MS = 60_000;
let lastSnapshotAt = 0;
let changeCache: { at: number; byId: Record<string, number> } | null = null;
let changeInflight: Promise<Record<string, number>> | null = null;

async function fetch24hAgoUsd(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (ids.length === 0) return out;
  try {
    const cfg = await getPriceChangeConfig();
    if (!cfg.enabled) return out;
    const now = Date.now();
    const target = new Date(now - WINDOW_MS).toISOString();
    const symbols = ids.map((id) => `${SYMBOL_PREFIX}${id}`);
    const { data } = await supabaseAdmin.rpc("closest_price_samples", {
      p_symbols: symbols,
      p_target: target,
      p_tol_ms: cfg.windowToleranceMs,
      p_min_age_ms: cfg.minSampleAgeMs,
    });
    for (const r of (data ?? []) as Array<{ symbol: string; price: number | string }>) {
      const sym = String(r.symbol);
      const id = sym.startsWith(SYMBOL_PREFIX) ? sym.slice(SYMBOL_PREFIX.length) : sym;
      const p = Number(r.price);
      if (Number.isFinite(p) && p > 0) out[id] = p;
    }
  } catch { /* ignore */ }
  return out;
}

/** Ghi snapshot priceUsd cho từng coin (throttle theo config). Fire-and-forget. */
async function recordSnapshots(coins: Array<{ id: string; priceUsd: number }>) {
  try {
    const cfg = await getPriceChangeConfig();
    const now = Date.now();
    if (now - lastSnapshotAt < cfg.snapshotMinIntervalMs) return;
    lastSnapshotAt = now;
    const rows = coins
      .filter((c) => Number.isFinite(c.priceUsd) && c.priceUsd > 0)
      .map((c) => ({ symbol: `${SYMBOL_PREFIX}${c.id}`, price: c.priceUsd }));
    if (rows.length === 0) return;
    void supabaseAdmin
      .from("price_history")
      .insert(rows)
      .then(() => undefined, () => undefined);
  } catch { /* ignore */ }
}

/** Tính lại bảng `change24h` từ DB (60s TTL, in-flight dedupe). */
async function ensureChangeCache(coins: Array<{ id: string; priceUsd: number }>): Promise<Record<string, number>> {
  const fresh = changeCache && Date.now() - changeCache.at < CHANGE_PCT_TTL_MS;
  if (fresh) return changeCache!.byId;
  if (changeInflight) return changeInflight;
  changeInflight = (async () => {
    const ids = coins.map((c) => c.id);
    const prev = await fetch24hAgoUsd(ids);
    const byId: Record<string, number> = {};
    for (const c of coins) {
      const p0 = prev[c.id];
      if (p0 && p0 > 0 && Number.isFinite(c.priceUsd) && c.priceUsd > 0) {
        byId[c.id] = ((c.priceUsd - p0) / p0) * 100;
      }
    }
    changeCache = { at: Date.now(), byId };
    return byId;
  })().finally(() => { changeInflight = null; });
  return changeInflight;
}

interface CGAsset {
  id?: string;
  symbol?: string;
  name?: string;
  image?: string;
  current_price?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
  price_change_percentage_24h?: number | null;
  sparkline_in_7d?: { price?: number[] } | null;
}

const FALLBACK_USD_VND = 25_400;

// CoinGecko id -> Binance spot symbol (against USDT). Coins without a Binance
// spot pair fall back to CoinGecko's price.
const BINANCE_SYMBOL: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  binancecoin: "BNBUSDT",
  solana: "SOLUSDT",
  ripple: "XRPUSDT",
  dogecoin: "DOGEUSDT",
  "the-open-network": "TONUSDT",
  cardano: "ADAUSDT",
  "avalanche-2": "AVAXUSDT",
  tron: "TRXUSDT",
  chainlink: "LINKUSDT",
  polkadot: "DOTUSDT",
  "polygon-ecosystem-token": "POLUSDT",
  "shiba-inu": "SHIBUSDT",
  litecoin: "LTCUSDT",
  "bitcoin-cash": "BCHUSDT",
  uniswap: "UNIUSDT",
  stellar: "XLMUSDT",
  near: "NEARUSDT",
  "internet-computer": "ICPUSDT",
  aptos: "APTUSDT",
  cosmos: "ATOMUSDT",
  "ethereum-classic": "ETCUSDT",
  filecoin: "FILUSDT",
  "hedera-hashgraph": "HBARUSDT",
  arbitrum: "ARBUSDT",
  vechain: "VETUSDT",
  maker: "MKRUSDT",
  "render-token": "RENDERUSDT",
  "injective-protocol": "INJUSDT",
  optimism: "OPUSDT",
  sui: "SUIUSDT",
  pepe: "PEPEUSDT",
  "wrapped-bitcoin": "WBTCUSDT",
  kaspa: "KASUSDT",
};

// Stablecoins pinned to $1 (Binance pair is the stable itself, no useful tick).
const STABLE_USD: Record<string, number> = {
  tether: 1,
  "usd-coin": 1,
  dai: 1,
};

// Live tickers: refresh every 5s; Binance is ~1s realtime upstream.
const TICKER_FRESH_MS = 5_000;
const TICKER_TIMEOUT_MS = 3_000;
interface LiveTick { price: number; change24h: number; volume24h: number }
let tickerCache: { at: number; data: Map<string, LiveTick> } | null = null;
let tickerInflight: Promise<Map<string, LiveTick>> | null = null;

async function fetchBinanceTickers(): Promise<Map<string, LiveTick>> {
  if (tickerCache && Date.now() - tickerCache.at < TICKER_FRESH_MS) {
    return tickerCache.data;
  }
  if (tickerInflight) return tickerInflight;
  tickerInflight = (async () => {
    const symbols = Object.values(BINANCE_SYMBOL);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TICKER_TIMEOUT_MS);
    try {
      const u = new URL("https://api.binance.com/api/v3/ticker/24hr");
      u.searchParams.set("symbols", JSON.stringify(symbols));
      const r = await fetch(u, { signal: ctrl.signal, headers: { accept: "application/json" } });
      if (!r.ok) throw new Error(`binance ${r.status}`);
      const arr = (await r.json()) as Array<{ symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }>;
      const map = new Map<string, LiveTick>();
      for (const t of arr) {
        map.set(t.symbol, {
          price: Number(t.lastPrice),
          change24h: Number(t.priceChangePercent),
          volume24h: Number(t.quoteVolume),
        });
      }
      tickerCache = { at: Date.now(), data: map };
      return map;
    } finally {
      clearTimeout(timer);
      tickerInflight = null;
    }
  })();
  try {
    return await tickerInflight;
  } catch {
    return tickerCache?.data ?? new Map();
  }
}

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSparkline(input: number[] | undefined, priceUsd: number): number[] {
  const arr = Array.isArray(input) ? input.filter((n) => Number.isFinite(n)) : [];
  if (arr.length === 0) {
    const base = priceUsd > 0 ? priceUsd : 1;
    return Array.from({ length: 48 }, (_, i) => base * (1 + Math.sin(i / 6) * 0.005));
  }
  // Downsample to ~48 points for compact wire size while keeping shape.
  if (arr.length <= 48) return arr;
  const step = arr.length / 48;
  const out: number[] = [];
  for (let i = 0; i < 48; i++) out.push(arr[Math.min(arr.length - 1, Math.floor(i * step))]);
  out[out.length - 1] = arr[arr.length - 1]; // preserve latest
  return out;
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

function cgHeaders() {
  const h: Record<string, string> = { accept: "application/json" };
  const key = process.env.COINGECKO_API_KEY;
  if (key) h["x-cg-demo-api-key"] = key;
  return h;
}

async function buildBasePayload() {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", COIN_IDS.join(","));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "24h");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);

  let data: CGAsset[];
  let usdVnd: number;
  try {
    const [res, usdVndVal] = await Promise.all([
      fetch(url, { headers: cgHeaders(), signal: ctrl.signal }),
      fetchUsdVnd(),
    ]);
    if (!res.ok) throw new Error(`crypto upstream ${res.status}`);
    data = (await res.json()) as CGAsset[];
    usdVnd = usdVndVal;
  } finally {
    clearTimeout(timer);
  }

  const ordered = COIN_IDS
    .map((id) => data.find((m) => m?.id === id))
    .filter((m): m is CGAsset => !!m);

  const coins = ordered.map((m) => {
    const id = String(m.id ?? m.symbol ?? "").toLowerCase();
    const symbol = String(m.symbol ?? id).toUpperCase();
    const name = String(m.name ?? symbol);
    const priceUsd = toNum(m.current_price, 0);
    return {
      id,
      symbol,
      name,
      image: m.image ?? "",
      priceUsd,
      priceVnd: priceUsd * usdVnd,
      change24h: toNum(m.price_change_percentage_24h, 0),
      marketCap: toNum(m.market_cap, 0),
      volume24h: toNum(m.total_volume, 0),
      sparkline: normalizeSparkline(m.sparkline_in_7d?.price, priceUsd),
    };
  });

  return { updatedAt: Date.now(), usdVnd, coins };
}

/**
 * Overlay live Binance prices (5s fresh) on top of the CoinGecko base payload
 * (60s fresh — owns marketCap, sparkline, metadata). Result is realtime within
 * ~5s while keeping slow-changing fields stable.
 */
async function buildPayload() {
  const base = await buildBasePayload();
  return overlayLive(base);
}

async function overlayLive(base: any) {
  const ticks = await fetchBinanceTickers();
  const usdVnd = base.usdVnd as number;
  const coins = (base.coins as any[]).map((c) => {
    const sym = BINANCE_SYMBOL[c.id];
    const tick = sym ? ticks.get(sym) : undefined;
    if (tick && Number.isFinite(tick.price) && tick.price > 0) {
      return {
        ...c,
        priceUsd: tick.price,
        priceVnd: tick.price * usdVnd,
        change24h: Number.isFinite(tick.change24h) ? tick.change24h : c.change24h,
        volume24h: Number.isFinite(tick.volume24h) && tick.volume24h > 0 ? tick.volume24h : c.volume24h,
      };
    }
    if (STABLE_USD[c.id] !== undefined) {
      const p = STABLE_USD[c.id];
      return { ...c, priceUsd: p, priceVnd: p * usdVnd };
    }
    return c;
  });
  return { ...base, coins, updatedAt: Date.now() };
}

/**
 * Bổ sung `change24h` từ DB cho những coin upstream thiếu (0 hoặc NaN).
 * Đồng thời ghi snapshot mới để lần sau có dữ liệu so sánh.
 * Dùng cache 60s + RPC `closest_price_samples` nên không query DB
 * trên mỗi request.
 */
async function applyDbChangeFallback(payload: any): Promise<any> {
  const coins = payload.coins as Array<{ id: string; priceUsd: number; change24h: number }>;
  if (!Array.isArray(coins) || coins.length === 0) return payload;
  // Snapshot mới (throttle theo config).
  void recordSnapshots(coins);
  // Nếu mọi coin đã có change24h hợp lệ ≠ 0 thì khỏi đụng DB.
  const needsFallback = coins.some((c) => !Number.isFinite(c.change24h) || c.change24h === 0);
  if (!needsFallback) return payload;
  const byId = await ensureChangeCache(coins);
  const merged = coins.map((c) => {
    if (Number.isFinite(c.change24h) && c.change24h !== 0) return c;
    const v = byId[c.id];
    return Number.isFinite(v) ? { ...c, change24h: v } : c;
  });
  return { ...payload, coins: merged };
}

function refresh(): Promise<any> {
  if (inflight) return inflight;
  inflight = buildBasePayload()
    .then((payload) => {
      cache = { at: Date.now(), payload };
      writePriceCache("crypto", payload);
      return payload;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
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
          // Cold start: hydrate in-memory cache from DB so we never wait on
          // CoinGecko's 3–6s upstream when a fresh isolate spins up.
          if (!cache) {
            const seed = await readPriceCache<any>("crypto", CACHE_SWR_MS);
            if (seed) cache = { at: seed.updatedAt, payload: seed.payload };
          }
          let base: any;
          const age = cache ? Date.now() - cache.at : Infinity;
          if (cache && age < CACHE_FRESH_MS) {
            base = cache.payload;
          } else if (cache && age < CACHE_SWR_MS) {
            base = cache.payload;
            refresh().catch(() => {});
          } else {
            try {
              base = await refresh();
            } catch (e) {
              if (cache) base = cache.payload;
              else throw e;
            }
          }
          // Always overlay live Binance prices (5s cache) on top of the
          // cached CoinGecko base. Keeps marketCap/sparkline stable while
          // making priceUsd / change24h near-realtime.
          const payload = await overlayLive(base);
          const finalPayload = await applyDbChangeFallback(payload);
          return new Response(JSON.stringify(finalPayload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              // Live overlay is 5s fresh upstream — let clients revalidate fast.
              "Cache-Control":
                "public, max-age=5, s-maxage=5, stale-while-revalidate=60",
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