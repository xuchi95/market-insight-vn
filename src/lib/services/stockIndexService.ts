import type { StockIndex } from "./types";

const FALLBACK: StockIndex[] = [
  { code: "VNINDEX", name: "VN-Index", exchange: "HOSE", value: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, updatedAt: Date.now() },
  { code: "VN30",    name: "VN30",     exchange: "HOSE", value: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, updatedAt: Date.now() },
  { code: "HNX",     name: "HNX-Index",exchange: "HNX",  value: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, updatedAt: Date.now() },
  { code: "HNX30",   name: "HNX30",    exchange: "HNX",  value: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, updatedAt: Date.now() },
  { code: "UPCOM",   name: "UPCOM-Index", exchange: "UPCOM", value: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, updatedAt: Date.now() },
];

export async function fetchStockIndices(): Promise<StockIndex[]> {
  try {
    const res = await fetch("/api/public/stocks", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    if (Array.isArray(j?.items) && j.items.length) return j.items as StockIndex[];
  } catch {
    /* fall through */
  }
  return FALLBACK;
}
