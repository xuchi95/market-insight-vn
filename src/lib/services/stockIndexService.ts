import type { StockIndex } from "./types";

export async function fetchStockIndices(): Promise<StockIndex[]> {
  const res = await fetch("/api/public/stocks", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Lỗi tải dữ liệu chỉ số (HTTP ${res.status})`);
  const j = await res.json();
  if (!Array.isArray(j?.items)) throw new Error("Phản hồi không hợp lệ");
  return j.items as StockIndex[];
}
