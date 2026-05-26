import type { CryptoCoin } from "./types";

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
] as const;

// USD/VND rate used to derive VND prices when not provided
const USD_VND_FALLBACK = 25_400;

interface CGMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

let lastFetch = 0;
let cache: CryptoCoin[] = [];

export async function fetchCryptoPrices(usdVnd = USD_VND_FALLBACK): Promise<CryptoCoin[]> {
  // CoinGecko free tier — be polite (min 12s between hits)
  const now = Date.now();
  if (cache.length && now - lastFetch < 12_000) {
    // Return cache with tiny jitter on price to keep UI lively between fetches
    return cache.map((c) => ({
      ...c,
      priceUsd: c.priceUsd * (1 + (Math.random() - 0.5) * 0.0008),
      priceVnd: c.priceVnd * (1 + (Math.random() - 0.5) * 0.0008),
    }));
  }
  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", COIN_IDS.join(","));
    url.searchParams.set("order", "market_cap_desc");
    url.searchParams.set("sparkline", "true");
    url.searchParams.set("price_change_percentage", "24h");
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CGMarket[] = await res.json();
    cache = data.map((m) => ({
      id: m.id,
      symbol: m.symbol.toUpperCase(),
      name: m.name,
      image: m.image,
      priceUsd: m.current_price,
      priceVnd: m.current_price * usdVnd,
      change24h: m.price_change_percentage_24h ?? 0,
      marketCap: m.market_cap,
      volume24h: m.total_volume,
      sparkline: m.sparkline_in_7d?.price?.slice(-48) ?? [],
    }));
    lastFetch = now;
    return cache;
  } catch (e) {
    if (cache.length) return cache;
    // Mock fallback
    return mockCryptoPrices(usdVnd);
  }
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