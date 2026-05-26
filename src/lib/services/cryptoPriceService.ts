import type { CryptoCoin } from "./types";

const USD_VND_FALLBACK = 25_400;

let cache: CryptoCoin[] = [];

export async function fetchCryptoPrices(usdVnd = USD_VND_FALLBACK): Promise<CryptoCoin[]> {
  try {
    const res = await fetch("/api/public/crypto", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (Array.isArray(j?.coins)) {
      cache = j.coins as CryptoCoin[];
      return cache;
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