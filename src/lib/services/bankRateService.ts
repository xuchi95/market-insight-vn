import type { BankRate } from "./types";

export interface BankRateResponse {
  items: BankRate[];
  updatedAt: number;
  source: string;
}

const FALLBACK: BankRateResponse = {
  items: [],
  updatedAt: Date.now(),
  source: "Vietcombank",
};

export async function fetchBankRates(): Promise<BankRateResponse> {
  try {
    const res = await fetch("/api/public/bank-rates", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    if (Array.isArray(j?.items)) {
      return { items: j.items as BankRate[], updatedAt: j.updatedAt ?? Date.now(), source: j.source ?? "Vietcombank" };
    }
  } catch {
    /* fallback */
  }
  return FALLBACK;
}
