import { Fuel } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "./SectionCard";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SOURCE_URL =
  "https://www.petrolimex.com.vn/nd/gia-xang-dau/gia-xang-dau-vung-1.html";

type FuelRow = {
  name: string;
  unit: string;
  zone1: number;
  zone2: number;
  highlight?: boolean;
};

type Snapshot = {
  effective_from: string;
  source_url: string;
  rows: FuelRow[];
};

const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export function VnFuelPriceTable() {
  const { data } = useQuery<Snapshot | null>({
    queryKey: ["public", "vn-fuel-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vn_fuel_prices_snapshot")
        .select("effective_from, source_url, rows")
        .eq("id", "latest")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        effective_from: data.effective_from,
        source_url: data.source_url,
        rows: (data.rows as unknown as FuelRow[]) ?? [],
      };
    },
    staleTime: 60_000,
  });

  const rows = data?.rows ?? [];
  const effectiveFrom = data?.effective_from ?? "—";
  const sourceUrl = data?.source_url ?? DEFAULT_SOURCE_URL;

  return (
    <SectionCard
      id="vn-fuel"
      icon={<Fuel className="h-4 w-4" />}
      title="Giá xăng dầu trong nước"
      action={
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Áp dụng từ {effectiveFrom}
        </a>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold tracking-wider">Mặt hàng</th>
              <th className="text-left px-4 py-3 font-semibold tracking-wider hidden sm:table-cell">
                Đơn vị
              </th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">Vùng 1</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">Vùng 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-display text-lg tracking-tight">{r.name}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{r.unit}</div>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                  {r.unit}
                </td>
                <td
                  className={`px-4 py-4 text-right tabular font-display text-xl tracking-tight ${
                    r.highlight ? "text-gold" : ""
                  }`}
                >
                  {fmtVnd(r.zone1)}
                </td>
                <td className="px-4 py-4 text-right tabular font-display text-lg text-muted-foreground">
                  {fmtVnd(r.zone2)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu giá xăng. Vui lòng cập nhật từ trang quản trị.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border bg-muted/20">
        Vùng 2 áp dụng cho địa bàn xa cảng, xa kho đầu mối, xa cơ sở sản xuất xăng dầu (chi phí
        vận chuyển cao). Giá có thể thay đổi sau mỗi kỳ điều chỉnh (thường thứ Năm hàng tuần) —
        nguồn:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Petrolimex
        </a>
        .
      </div>
    </SectionCard>
  );
}