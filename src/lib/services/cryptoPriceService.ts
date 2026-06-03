import type { CryptoCoin } from "./types";

const USD_VND_FALLBACK = 25_400;

let cache: CryptoCoin[] = [];

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSparkline(input: unknown, priceUsd: number): number[] {
  const arr = Array.isArray(input)
    ? (input as unknown[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
    : [];
  if (arr.length > 0) return arr.slice(-48);
  const base = priceUsd > 0 ? priceUsd : 1;
  return Array.from({ length: 48 }, (_, i) => base * (1 + Math.sin(i / 6) * 0.005));
}

function normalizeCoin(raw: any, usdVnd: number): CryptoCoin | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw.symbol ?? "").toLowerCase();
  const symbol = String(raw.symbol ?? id).toUpperCase();
  if (!id && !symbol) return null;
  const priceUsd = toNum(raw.priceUsd ?? raw.current_price, 0);
  const priceVnd = toNum(raw.priceVnd, priceUsd * usdVnd);
  return {
    id: id || symbol.toLowerCase(),
    symbol: symbol || id.toUpperCase(),
    name: String(raw.name ?? symbol ?? id),
    image: typeof raw.image === "string" ? raw.image : "",
    priceUsd,
    priceVnd,
    change24h: toNum(raw.change24h ?? raw.price_change_percentage_24h, 0),
    marketCap: toNum(raw.marketCap ?? raw.market_cap, 0),
    volume24h: toNum(raw.volume24h ?? raw.total_volume, 0),
    sparkline: normalizeSparkline(raw.sparkline ?? raw.sparkline_in_7d?.price, priceUsd),
  };
}

export async function fetchCryptoPrices(usdVnd = USD_VND_FALLBACK): Promise<CryptoCoin[]> {
  try {
    // Để browser HTTP cache hoạt động theo header `Cache-Control` của API
    // (max-age=15, s-maxage=20, stale-while-revalidate=300). Trước đây dùng
    // `?t=Date.now()` + `cache: "no-store"` khiến mỗi lần load đều phải gọi
    // Worker, làm cold-start chậm 3–6s.
    const res = await fetch(`/api/public/crypto`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const rate = toNum(j?.usdVnd, usdVnd);
    if (Array.isArray(j?.coins)) {
      const normalized = (j.coins as unknown[])
        .map((c) => normalizeCoin(c, rate))
        .filter((c): c is CryptoCoin => c !== null);
      if (normalized.length) {
        cache = normalized;
        return cache;
      }
    }
  } catch { /* fallback */ }
  if (cache.length) return cache;
  return mockCryptoPrices(usdVnd);
}

function mockCryptoPrices(usdVnd: number): CryptoCoin[] {
  const seed: Array<[string, string, string, number, number]> = [
    ["bitcoin", "BTC", "Bitcoin", 96_800, 2.4],
    ["ethereum", "ETH", "Ethereum", 3_360, 1.8],
    ["tether", "USDT", "Tether", 1, 0.01],
    ["binancecoin", "BNB", "BNB", 690, -0.6],
    ["solana", "SOL", "Solana", 210, 3.1],
    ["ripple", "XRP", "XRP", 2.25, -1.2],
    ["dogecoin", "DOGE", "Dogecoin", 0.39, 4.5],
    ["the-open-network", "TON", "Toncoin", 5.6, -0.4],
    ["cardano", "ADA", "Cardano", 0.94, 1.1],
    ["avalanche-2", "AVAX", "Avalanche", 38, -2.3],
  ];
  return seed.map(([id, sym, name, price, ch]) => ({
    id, symbol: sym, name,
    image: `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`,
    priceUsd: price, priceVnd: price * usdVnd,
    change24h: ch, marketCap: price * 1e9, volume24h: price * 1e8,
    sparkline: Array.from({ length: 48 }, (_, i) => price * (1 + Math.sin(i / 5) * 0.03 + (Math.random() - 0.5) * 0.01)),
  }));
}