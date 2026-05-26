export interface GoldPrice {
  id: string;
  brand: string;
  type: string;
  buy: number;   // VND per chỉ (or per oz for XAU)
  sell: number;
  unit: string;  // "VND/chỉ" | "USD/oz"
  changePct: number;
  updatedAt: number;
}

export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  priceUsd: number;
  priceVnd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  sparkline: number[];
}

export interface ForexRate {
  code: string;
  name: string;
  buy: number;
  sell: number;
  mid: number;
  changePct: number;
  updatedAt: number;
}

export interface NewsItem {
  id: string;
  category: "gold" | "crypto" | "forex" | "economy";
  title: string;
  source: string;
  publishedAt: number;
  url: string;
  excerpt: string;
}