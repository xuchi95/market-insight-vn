/**
 * Helpers chuẩn hoá đơn vị giá vàng VN.
 *
 * Giá trên trang luôn hiển thị **VND / chỉ**. Upstream có 2 dạng:
 * - Live PNJ (`/get-gold-price`): số *ngàn VND / chỉ* (vd `16150` → 16.150.000 VND/chỉ).
 * - History PNJ (`/get-gold-price-history`): chuỗi *ngàn VND / lượng* ("158.500" → 158500 → 15.850.000 VND/chỉ).
 *
 * Một lượng = 10 chỉ.
 *   ngàn/chỉ  → VND/chỉ  : × 1000
 *   ngàn/lượng → VND/chỉ : × 1000 / 10 = × 100
 */

export const NGAN_CHI_TO_VND_CHI = 1000;
export const NGAN_LUONG_TO_VND_CHI = 100;

/** Khoảng hợp lệ cho giá vàng VN (VND/chỉ) — loại bỏ điểm dữ liệu rác. */
export const MIN_VND_CHI = 5_000_000;
export const MAX_VND_CHI = 50_000_000;

/** ngàn VND/chỉ (live PNJ) → VND/chỉ. */
export function vndPerChiFromNganChi(n: number): number {
  return n * NGAN_CHI_TO_VND_CHI;
}

/** ngàn VND/lượng (PNJ history) → VND/chỉ. */
export function vndPerChiFromNganLuong(n: number): number {
  return n * NGAN_LUONG_TO_VND_CHI;
}

/** Alias mặc định dùng cho dữ liệu history (đơn vị phổ biến nhất trong project). */
export const toVndPerChi = vndPerChiFromNganLuong;

/** Parse số kiểu VN ("158.500" → 158500). */
export function parseVnNumber(s: string | number | null | undefined): number {
  if (s == null) return 0;
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  const cleaned = String(s).replace(/\./g, "").replace(/,/g, ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Trả `true` nếu giá VND/chỉ nằm trong khoảng hợp lệ. */
export function isValidVndChi(v: number): boolean {
  return Number.isFinite(v) && v >= MIN_VND_CHI && v <= MAX_VND_CHI;
}

/** Mid (giá trung bình) từ mua / bán. */
export function midOf(buy: number, sell: number): number {
  return (buy + sell) / 2;
}