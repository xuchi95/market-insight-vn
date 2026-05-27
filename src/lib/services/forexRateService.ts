import type { ForexRate } from "./types";

const FALLBACK: ForexRate[] = [
  { code: "USD", name: "Đô la Mỹ",        buy: 25_280, sell: 25_520, mid: 25_400, changePct: 0, updatedAt: Date.now() },
  { code: "EUR", name: "Euro",            buy: 27_120, sell: 27_840, mid: 27_480, changePct: 0, updatedAt: Date.now() },
  { code: "GBP", name: "Bảng Anh",        buy: 31_640, sell: 32_540, mid: 32_090, changePct: 0, updatedAt: Date.now() },
  { code: "JPY", name: "Yên Nhật",        buy: 162,    sell: 171,    mid: 167,    changePct: 0, updatedAt: Date.now() },
  { code: "CNY", name: "Nhân dân tệ",     buy: 3_480,  sell: 3_580,  mid: 3_530,  changePct: 0, updatedAt: Date.now() },
];

export async function fetchForexRates(): Promise<ForexRate[]> {
  try {
    const res = await fetch("/api/public/ty-gia-ngoai-te", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    if (Array.isArray(j?.rates)) return j.rates as ForexRate[];
  } catch {
    /* fallback */
  }
  return FALLBACK;
}

export async function fetchUsdVnd(): Promise<number> {
  const rates = await fetchForexRates();
  const usd = rates.find((r) => r.code === "USD");
  return usd?.mid ?? 25_400;
}