import type { BankRate } from "./types";

export interface BankRateResponse {
  items: BankRate[];
  updatedAt: number;
  source: string;
}

export async function fetchBankRates(): Promise<BankRateResponse> {
  const res = await fetch("/api/public/lai-suat-ngan-hang", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Lỗi tải tỷ giá (HTTP ${res.status})`);
  const j = await res.json();
  if (!Array.isArray(j?.items)) throw new Error("Phản hồi không hợp lệ");
  return {
    items: j.items as BankRate[],
    updatedAt: j.updatedAt ?? Date.now(),
    source: j.source ?? "Vietcombank",
  };
}
