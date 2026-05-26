import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fmtVND, fmtNum, fmtTime } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { SectionCard } from "./SectionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function GoldPriceTable({ search }: { search?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["gold"],
    queryFn: fetchGoldPrices,
    refetchInterval: 15 * 60 * 1000,
  });
  const [brand, setBrand] = useState("all");

  const brands = useMemo(() => {
    const s = new Set<string>();
    data?.forEach((d) => s.add(d.brand));
    return ["all", ...Array.from(s)];
  }, [data]);

  const rows = useMemo(() => {
    let r = data ?? [];
    if (brand !== "all") r = r.filter((d) => d.brand === brand);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((d) => d.brand.toLowerCase().includes(q) || d.type.toLowerCase().includes(q));
    }
    return r;
  }, [data, brand, search]);

  return (
    <SectionCard
      id="gold"
      icon={<Coins className="h-4 w-4" />}
      title="Bảng giá vàng"
      description="Giá vàng trong nước và quốc tế — đơn vị VND/chỉ (XAU/USD theo ounce)"
      action={
        <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Thương hiệu" /></SelectTrigger>
            <SelectContent>
              {brands.map((b) => <SelectItem key={b} value={b}>{b === "all" ? "Tất cả thương hiệu" : b}</SelectItem>)}
            </SelectContent>
        </Select>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Thương hiệu</th>
              <th className="text-left px-4 py-3 font-semibold">Loại vàng</th>
              <th className="text-right px-4 py-3 font-semibold">Mua vào</th>
              <th className="text-right px-4 py-3 font-semibold">Bán ra</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Chênh lệch</th>
              <th className="text-right px-4 py-3 font-semibold">Thay đổi</th>
              <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((g) => {
              const isUsd = g.unit.includes("USD");
              const fmt = isUsd ? (n: number) => `$${fmtNum(n, 2)}` : fmtVND;
              return (
                <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold">{g.brand}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.type}</td>
                  <td className="px-4 py-3 text-right tabular">{fmt(g.buy)}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{fmt(g.sell)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground hidden md:table-cell">{fmt(g.sell - g.buy)}</td>
                  <td className="px-4 py-3 text-right"><ChangeBadge value={g.changePct} /></td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular hidden lg:table-cell">{fmtTime(g.updatedAt)}</td>
                </tr>
              );
            })}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Không tìm thấy kết quả phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}