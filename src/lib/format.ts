export const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

export const fmtUSD = (n: number, max = 2) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: max }).format(n);

export const fmtNum = (n: number, max = 2) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: max }).format(n);

/**
 * Format VND amount in "triệu" (millions) using Vietnamese decimal comma.
 * 16_700_000 → "16,7"   16_750_000 → "16,75"   16_000_000 → "16"
 * Use for gold prices and large VND values across the site for consistency.
 */
export const fmtTrieu = (vnd: number, max = 2) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: max }).format(vnd / 1_000_000);

export const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export const fmtCompactUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

/**
 * Compact VND formatter using Vietnamese magnitude suffixes (nghìn/triệu/tỷ/nghìn tỷ).
 * Designed for dashboard tiles & tables where huge numbers would overflow.
 * 230_275_121_463 → "230,28 tỷ ₫"
 * 94_799_999_999_880 → "94,80 nghìn tỷ ₫"
 */
export const fmtVNDCompact = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const nf = (v: number, max = 2) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: max }).format(v);
  if (abs >= 1_000_000_000_000) return `${sign}${nf(abs / 1_000_000_000_000)} nghìn tỷ ₫`;
  if (abs >= 1_000_000_000) return `${sign}${nf(abs / 1_000_000_000)} tỷ ₫`;
  if (abs >= 1_000_000) return `${sign}${nf(abs / 1_000_000)} triệu ₫`;
  if (abs >= 1_000) return `${sign}${nf(abs / 1_000, 0)} nghìn ₫`;
  return fmtVND(n);
};

export const fmtTime = (d: Date | number) => {
  const date = typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
};

export const fmtDate = (d: Date | number) => {
  const date = typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};