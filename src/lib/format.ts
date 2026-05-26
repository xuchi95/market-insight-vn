export const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

export const fmtUSD = (n: number, max = 2) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: max }).format(n);

export const fmtNum = (n: number, max = 2) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: max }).format(n);

export const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export const fmtCompactUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

export const fmtTime = (d: Date | number) => {
  const date = typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
};

export const fmtDate = (d: Date | number) => {
  const date = typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};