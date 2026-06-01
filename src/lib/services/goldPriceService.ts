import type { GoldPrice } from "./types";
import { midOf } from "@/lib/gold-units";

// Bổ sung các thương hiệu chưa có trong feed PNJ — jitter giả lập quanh giá gần đây.
// XAU/USD KHÔNG nằm đây nữa: lấy realtime từ `/api/public/xau` (xem `fetchXauRow`).
const SUPPLEMENTAL: Omit<GoldPrice, "changePct" | "updatedAt">[] = [
  { id: "mihong-9999", brand: "Mi Hồng", type: "Vàng miếng 9999", buy: 15_780_000, sell: 16_080_000, unit: "VND/chỉ" },
  { id: "18k", brand: "Vàng 18K", type: "Vàng trang sức 18K", buy: 11_800_000, sell: 12_100_000, unit: "VND/chỉ" },
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
    const mid = midOf(buy, sell);
    const prevMid = prev?.prevMid ?? mid;
    const changePct = ((mid - prevMid) / prevMid) * 100;
    fallbackState.set(g.id, { buy, sell, prevMid: prev?.prevMid ?? mid });
    if (Math.random() < 0.15) fallbackState.get(g.id)!.prevMid = mid;
    return {
      ...g,
      buy: Math.round(buy),
      sell: Math.round(sell),
      mid: g.unit === "VND/chỉ" ? Math.round(mid) : undefined,
      changePct,
      updatedAt: now,
    };
  });
}

// Full fallback (used when API endpoint fails completely)
const FALLBACK_LIVE: GoldPrice[] = (
  [
    { id: "sjc-1l", brand: "SJC", type: "Vàng miếng SJC 1L", buy: 15_850_000, sell: 16_150_000 },
    { id: "btmc-vrtl", brand: "Bảo Tín Minh Châu", type: "Vàng miếng Rồng Thăng Long", buy: 15_850_000, sell: 16_150_000 },
    { id: "btmc-nhan", brand: "Bảo Tín Minh Châu", type: "Nhẫn tròn trơn 9999", buy: 15_850_000, sell: 16_150_000 },
    { id: "doji", brand: "DOJI", type: "Vàng miếng 9999", buy: 15_750_000, sell: 15_950_000 },
    { id: "pnj", brand: "PNJ", type: "Vàng miếng 9999", buy: 15_730_000, sell: 15_930_000 },
    { id: "phuquy", brand: "Phú Quý", type: "Vàng miếng 9999", buy: 15_710_000, sell: 15_910_000 },
    { id: "nguyenlieu", brand: "Vàng 24K", type: "Vàng nguyên liệu 24K", buy: 14_350_000, sell: 14_550_000 },
  ] as const
).map((g) => ({
  ...g,
  mid: midOf(g.buy, g.sell),
  unit: "VND/chỉ",
  changePct: 0,
  updatedAt: Date.now(),
}));

export async function fetchGoldPrices(): Promise<GoldPrice[]> {
  const now = Date.now();
  const supplemental = supplementalRows(now);
  // Fetch live gold + XAU world-price in parallel — đừng tuần tự,
  // mỗi cái có thể mất 1–6s.
  const [goldRes, xau] = await Promise.all([
    fetch("/api/public/gold", { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`gold api ${r.status}`);
        const j = (await r.json()) as { items?: GoldPrice[] };
        const live = (j.items ?? []) as GoldPrice[];
        if (live.length === 0) throw new Error("empty");
        return live;
      })
      .catch(() => null),
    fetchXauRow().catch(() => null),
  ]);
  const live = goldRes ?? FALLBACK_LIVE;
  return [...live, ...supplemental, ...(xau ? [xau] : [])];
}

/**
 * Lấy giá vàng thế giới XAU/USD realtime từ `/api/public/xau` (gold-api.com),
 * chuẩn hoá thành 1 dòng `GoldPrice` cùng schema với các thương hiệu VN.
 *
 * - Đơn vị giữ nguyên USD/oz — không quy đổi sang VND/chỉ ở đây.
 * - Nếu upstream có `bid`/`ask` → dùng làm buy/sell, ngược lại dùng `price`
 *   làm cả buy/sell (chênh lệch = 0) để không hiển thị spread giả.
 */
async function fetchXauRow(): Promise<GoldPrice | null> {
  try {
    const res = await fetch("/api/public/xau", { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      price?: number;
      bid?: number | null;
      ask?: number | null;
      changePct?: number;
      updatedAt?: number;
      unit?: string;
    };
    const price = Number(j?.price);
    if (!Number.isFinite(price) || price <= 0) return null;
    const buy = Number.isFinite(Number(j?.bid)) ? Number(j!.bid) : price;
    const sell = Number.isFinite(Number(j?.ask)) ? Number(j!.ask) : price;
    return {
      id: "xauusd",
      brand: "Vàng thế giới",
      type: "XAU/USD (ounce)",
      buy,
      sell,
      mid: midOf(buy, sell),
      unit: j?.unit ?? "USD/oz",
      changePct: Number(j?.changePct) || 0,
      updatedAt: typeof j?.updatedAt === "number" ? j.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}