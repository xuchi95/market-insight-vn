import type { GoldPrice } from "./types";

// Base prices (VND per chỉ ~ 3.75g). Adapter is ready to be swapped for real APIs.
const BASE: Omit<GoldPrice, "changePct" | "updatedAt">[] = [
  { id: "sjc-1l", brand: "SJC", type: "Vàng miếng SJC 1L", buy: 8_320_000, sell: 8_420_000, unit: "VND/chỉ" },
  { id: "doji-hh", brand: "DOJI", type: "Hưng Thịnh Vượng 9999", buy: 8_290_000, sell: 8_390_000, unit: "VND/chỉ" },
  { id: "pnj-9999", brand: "PNJ", type: "Vàng miếng 9999", buy: 8_280_000, sell: 8_385_000, unit: "VND/chỉ" },
  { id: "btmh-9999", brand: "Bảo Tín Minh Châu", type: "Vàng Rồng Thăng Long", buy: 8_300_000, sell: 8_395_000, unit: "VND/chỉ" },
  { id: "phuquy-9999", brand: "Phú Quý", type: "Vàng miếng 9999", buy: 8_270_000, sell: 8_380_000, unit: "VND/chỉ" },
  { id: "mihong-9999", brand: "Mi Hồng", type: "Vàng miếng 9999", buy: 8_260_000, sell: 8_370_000, unit: "VND/chỉ" },
  { id: "nhan-9999", brand: "Vàng nhẫn", type: "Nhẫn tròn trơn 9999", buy: 8_240_000, sell: 8_340_000, unit: "VND/chỉ" },
  { id: "24k", brand: "Vàng 24K", type: "Vàng nguyên liệu 24K", buy: 8_220_000, sell: 8_320_000, unit: "VND/chỉ" },
  { id: "18k", brand: "Vàng 18K", type: "Vàng trang sức 18K", buy: 6_180_000, sell: 6_320_000, unit: "VND/chỉ" },
  { id: "xauusd", brand: "Vàng thế giới", type: "XAU/USD (ounce)", buy: 2_640, sell: 2_645, unit: "USD/oz" },
];

// Persisted live state — fluctuates around base
const state = new Map<string, { buy: number; sell: number; prevMid: number; updatedAt: number }>();

function jitter(base: number, amplitude = 0.0015) {
  const drift = (Math.random() - 0.5) * 2 * amplitude;
  return base * (1 + drift);
}

export async function fetchGoldPrices(): Promise<GoldPrice[]> {
  const now = Date.now();
  return BASE.map((g) => {
    const prev = state.get(g.id);
    const buy = prev ? jitter(prev.buy) : g.buy;
    const sell = prev ? jitter(prev.sell) : g.sell;
    const mid = (buy + sell) / 2;
    const prevMid = prev?.prevMid ?? (g.buy + g.sell) / 2;
    const changePct = ((mid - prevMid) / prevMid) * 100;
    state.set(g.id, { buy, sell, prevMid: prev?.prevMid ?? mid, updatedAt: now });
    // Update baseline slowly so changes accumulate
    if (Math.random() < 0.15) state.get(g.id)!.prevMid = mid;
    return { ...g, buy: Math.round(buy), sell: Math.round(sell), changePct, updatedAt: now };
  });
}