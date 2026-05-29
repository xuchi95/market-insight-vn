export interface GoldPrice {
  id: string;
  brand: string;
  type: string;
  buy: number;   // VND per chỉ (or per oz for XAU)
  sell: number;
  mid?: number;  // (buy+sell)/2 — chỉ có cho dữ liệu VND/chỉ
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

export interface StockIndex {
  code: string;          // VNINDEX, VN30, HNX, HNX30, UPCOM
  name: string;          // Display name
  exchange: string;      // HOSE, HNX, UPCOM
  value: number;         // Latest close
  change: number;        // Absolute change vs prev close
  changePct: number;     // % change vs prev close
  high: number;
  low: number;
  volume: number;        // Last session volume (shares)
  updatedAt: number;
}

export interface BankRate {
  code: string;          // Currency code (USD, EUR, ...)
  name: string;          // Currency display name
  cash: number;          // Mua tiền mặt
  transfer: number;      // Mua chuyển khoản
  sell: number;          // Bán
  updatedAt: number;
}