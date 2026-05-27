import type { GoldPrice } from "./types";

// Supplemental rows: world XAU/USD and brands not covered by the live gold feed.
// These are jitter-simulated until a dedicated source is wired in.
const SUPPLEMENTAL: Omit<GoldPrice, "changePct" | "updatedAt">[] = [
  { id: "mihong-9999", brand: "Mi Hồng", type: "Vàng miếng 9999", buy: 15_780_000, sell: 16_080_000, unit: "VND/lượng" },
  { id: "18k", brand: "Vàng 18K", type: "Vàng trang sức 18K", buy: 11_800_000, sell: 12_100_000, unit: "VND/lượng" },
  { id: "xauusd", brand: "Vàng thế giới", type: "XAU/USD (ounce)", buy: 2_640, sell: 2_645, unit: "USD/oz" },
];

const fallbackState = new Map<string, { buy: number; sell: number; prevMid: number }>();

function jitter(base: number, amplitude = 0.0015) {
  return base * (1 + (Math.random() - 0.5) * 2 * amplitude);
}

function supplementalRows(now: number): GoldPrice[] {
  return SUPPLEMENTAL.map((g) => {
    const prev = fallbackState.get(g.id);
    const buy = prev ? jitter(prev.buy) : g.buy;
    const sell = prev ? jitter(prev.sell) : g.sell;
    const mid = (buy + sell) / 2;
    const prevMid = prev?.prevMid ?? mid;
    const changePct = ((mid - prevMid) / prevMid) * 100;
    fallbackState.set(g.id, { buy, sell, prevMid: prev?.prevMid ?? mid });
    if (Math.random() < 0.15) fallbackState.get(g.id)!.prevMid = mid;
    return { ...g, buy: Math.round(buy), sell: Math.round(sell), changePct, updatedAt: now };
  });
}

// Full fallback (used when API endpoint fails completely)
const FALLBACK_LIVE: GoldPrice[] = [
  { id: "sjc-1l", brand: "SJC", type: "Vàng miếng SJC 1L", buy: 15_850_000, sell: 16_150_000, unit: "VND/lượng", changePct: 0, updatedAt: Date.now() },
  { id: "btmc-vrtl", brand: "Bảo Tín Minh Châu", type: "Vàng miếng Rồng Thăng Long", buy: 15_850_000, sell: 16_150_000, unit: "VND/lượng", changePct: 0, updatedAt: Date.now() },
  { id: "btmc-nhan", brand: "Bảo Tín Minh Châu", type: "Nhẫn tròn trơn 9999", buy: 15_850_000, sell: 16_150_000, unit: "VND/lượng", changePct: 0, updatedAt: Date.now() },
  { id: "doji", brand: "DOJI", type: "Vàng miếng 9999", buy: 15_750_000, sell: 15_950_000, unit: "VND/lượng", changePct: 0, updatedAt: Date.now() },
  { id: "pnj", brand: "PNJ", type: "Vàng miếng 9999", buy: 15_730_000, sell: 15_930_000, unit: "VND/lượng", changePct: 0, updatedAt: Date.now() },
  { id: "phuquy", brand: "Phú Quý", type: "Vàng miếng 9999", buy: 15_710_000, sell: 15_910_000, unit: "VND/lượng", changePct: 0, updatedAt: Date.now() },
  { id: "nguyenlieu", brand: "Vàng 24K", type: "Vàng nguyên liệu 24K", buy: 14_350_000, sell: 14_550_000, unit: "VND/lượng", changePct: 0, updatedAt: Date.now() },
];

export async function fetchGoldPrices(): Promise<GoldPrice[]> {
  const now = Date.now();
  try {
    const res = await fetch("/api/public/gold", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`gold api ${res.status}`);
    const json = (await res.json()) as { items?: GoldPrice[] };
    const live = (json.items ?? []) as GoldPrice[];
    if (live.length === 0) throw new Error("empty");
    return [...live, ...supplementalRows(now)];
  } catch {
    return [...FALLBACK_LIVE, ...supplementalRows(now)];
  }
}