export const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

/**
 * USD currency with **fixed** decimals so column widths don't jump when the
 * value crosses a power-of-ten boundary. Defaults: 2 decimals (use 4 for
 * sub-dollar prices like meme coins).
 */
export const fmtUSD = (n: number, decimals = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

/**
 * Plain Vietnamese number with **fixed** decimal places. Always shows the
 * same number of decimals to keep tabular columns aligned.
 */
export const fmtNum = (n: number, decimals = 2) =>
  new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

/**
 * Format VND amount in "triệu" (millions) using Vietnamese decimal comma.
 * 16_700_000 → "16,7"   16_750_000 → "16,75"   16_000_000 → "16"
 * Use for gold prices and large VND values across the site for consistency.
 */
export const fmtTrieu = (vnd: number, decimals = 2) =>
  new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(vnd / 1_000_000);

export const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export const fmtCompactUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/** Plain compact number (no currency symbol): 1.23K / 4.56M / 7.89B. */
export const fmtCompact = (n: number, decimals = 2) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

/**
 * Smart USD price formatter that respects the user's compact preference.
 * Compact mode kicks in only for values ≥ 10,000 so prices like $63,250 stay
 * readable while $1.23B / $4.56M get abbreviated.
 */
export const fmtSmartUSD = (n: number, compact: boolean, decimals = 2) => {
  // Sub-dollar prices (meme coins like SHIB, PEPE) need adaptive precision —
  // a fixed 4 decimals renders $0.00000529 as "$0.0000". Use significant
  // digits so tiny values keep meaningful precision.
  const abs = Math.abs(n);
  if (abs > 0 && abs < 1) {
    const frac = abs < 0.0001 ? 8 : abs < 0.01 ? 6 : 4;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: frac,
    }).format(n);
  }
  if (!compact || Math.abs(n) < 10_000) return fmtUSD(n, decimals);
  return fmtCompactUSD(n);
};

/** Smart VND formatter that respects the compact preference. */
export const fmtSmartVND = (n: number, compact: boolean) => {
  const abs = Math.abs(n);
  if (abs > 0 && abs < 1000) {
    // Tiny VND amounts (meme-coin unit price) — show fractional đồng so we
    // don't display "0 ₫" for things like 0,13 ₫.
    const frac = abs < 0.01 ? 6 : abs < 1 ? 4 : 2;
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 2,
      maximumFractionDigits: frac,
    }).format(n);
  }
  if (!compact || Math.abs(n) < 1_000_000) return fmtVND(n);
  return fmtVNDCompact(n);
};

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