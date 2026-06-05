import type { GoldDigestRow, CoinDigestRow, FxDigestRow } from "./templates.server";

const OZ_PER_LUONG = 1.20556;

async function fetchFmpQuote(symbol: string): Promise<{ price: number; changePct: number | null } | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${key}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ price?: number; changesPercentage?: number }>;
    const row = arr?.[0];
    if (!row || typeof row.price !== "number") return null;
    return {
      price: row.price,
      changePct: typeof row.changesPercentage === "number" ? row.changesPercentage : null,
    };
  } catch {
    return null;
  }
}

export async function fetchDailyGoldRows(): Promise<GoldDigestRow[]> {
  const [xau, usdvnd] = await Promise.all([fetchFmpQuote("XAUUSD"), fetchFmpQuote("USDVND")]);
  if (!xau || !usdvnd) return [];
  const vndPerLuong = xau.price * usdvnd.price * OZ_PER_LUONG;
  const sell = Math.round(vndPerLuong / 1000) * 1000;
  const buy = Math.round((vndPerLuong * 0.995) / 1000) * 1000;
  return [
    { label: "Vàng SJC (ước tính)", buy, sell, changePct: xau.changePct },
    { label: "XAU/USD", buy: null, sell: Math.round(xau.price), changePct: xau.changePct },
  ];
}

export async function fetchDailyCryptoRows(): Promise<CoinDigestRow[]> {
  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("order", "market_cap_desc");
    url.searchParams.set("per_page", "10");
    url.searchParams.set("page", "1");
    url.searchParams.set("price_change_percentage", "24h");
    const headers: Record<string, string> = { accept: "application/json" };
    const key = process.env.COINGECKO_API_KEY;
    if (key) headers["x-cg-demo-api-key"] = key;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const arr = (await res.json()) as Array<{
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number | null;
    }>;
    return arr
      .filter((c) => typeof c.current_price === "number")
      .map((c) => ({
        symbol: c.symbol,
        name: c.name,
        price: c.current_price,
        changePct: typeof c.price_change_percentage_24h === "number" ? c.price_change_percentage_24h : 0,
      }));
  } catch {
    return [];
  }
}

export async function fetchDailyFxRows(): Promise<FxDigestRow[]> {
  const pairs: Array<{ symbol: string; pair: string }> = [
    { symbol: "USDVND", pair: "USD/VND" },
    { symbol: "EURVND", pair: "EUR/VND" },
    { symbol: "JPYVND", pair: "JPY/VND" },
    { symbol: "GBPVND", pair: "GBP/VND" },
    { symbol: "CNYVND", pair: "CNY/VND" },
    { symbol: "AUDVND", pair: "AUD/VND" },
    { symbol: "KRWVND", pair: "KRW/VND" },
    { symbol: "SGDVND", pair: "SGD/VND" },
  ];
  const quotes = await Promise.all(pairs.map((p) => fetchFmpQuote(p.symbol)));
  const rows: FxDigestRow[] = [];
  pairs.forEach((p, i) => {
    const q = quotes[i];
    if (!q) return;
    rows.push({ pair: p.pair, rate: q.price, changePct: q.changePct });
  });
  return rows;
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ---------- Sample/mock data for offline preview ----------

export function sampleGoldRows(): GoldDigestRow[] {
  return [
    { label: "Vàng SJC (ước tính)", buy: 84_200_000, sell: 84_700_000, changePct: 0.42 },
    { label: "Vàng nhẫn 9999 (ước tính)", buy: 82_900_000, sell: 83_400_000, changePct: 0.31 },
    { label: "XAU/USD", buy: null, sell: 2_658, changePct: 0.38 },
  ];
}

export function sampleCryptoRows(): CoinDigestRow[] {
  return [
    { symbol: "btc", name: "Bitcoin", price: 96_800, changePct: 2.41 },
    { symbol: "eth", name: "Ethereum", price: 3_360, changePct: 1.82 },
    { symbol: "usdt", name: "Tether", price: 1.0001, changePct: 0.01 },
    { symbol: "bnb", name: "BNB", price: 690.4, changePct: -0.62 },
    { symbol: "sol", name: "Solana", price: 210.7, changePct: 3.14 },
    { symbol: "xrp", name: "XRP", price: 2.25, changePct: -1.21 },
    { symbol: "doge", name: "Dogecoin", price: 0.39, changePct: 4.55 },
    { symbol: "ton", name: "Toncoin", price: 5.62, changePct: -0.41 },
    { symbol: "ada", name: "Cardano", price: 0.94, changePct: 1.12 },
    { symbol: "avax", name: "Avalanche", price: 38.4, changePct: -2.32 },
  ];
}

export function sampleFxRows(): FxDigestRow[] {
  return [
    { pair: "USD/VND", rate: 25_410, changePct: 0.05 },
    { pair: "EUR/VND", rate: 27_120, changePct: -0.18 },
    { pair: "JPY/VND", rate: 168.4, changePct: -0.22 },
    { pair: "GBP/VND", rate: 32_240, changePct: 0.11 },
    { pair: "CNY/VND", rate: 3_512, changePct: 0.03 },
    { pair: "AUD/VND", rate: 16_410, changePct: -0.27 },
    { pair: "KRW/VND", rate: 18.6, changePct: -0.15 },
    { pair: "SGD/VND", rate: 18_780, changePct: 0.08 },
  ];
}