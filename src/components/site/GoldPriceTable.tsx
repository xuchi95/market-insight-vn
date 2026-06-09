import { useMemo, useState } from "react";
import { AlertTriangle, Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fmtNum, fmtTime, fmtTrieu } from "@/lib/format";
import { useNumberFormat } from "@/hooks/useNumberFormat";
import { AnimatedNumber } from "./AnimatedNumber";
import { midOf } from "@/lib/gold-units";
import { ChangeBadge } from "./ChangeBadge";
import { SectionCard } from "./SectionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/hooks/useQueryErrorToast";

export function GoldPriceTable({ search }: { search?: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["gold"],
    queryFn: fetchGoldPrices,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
  useQueryErrorToast(isError, error, "giá vàng");
  const { compact } = useNumberFormat();
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
      action={
        <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Thương hiệu" /></SelectTrigger>
            <SelectContent>
              {brands.map((b) => <SelectItem key={b} value={b}>{b === "all" ? "Tất cả thương hiệu" : b}</SelectItem>)}
            </SelectContent>
        </Select>
      }
    >
      {isError && (data?.length ?? 0) > 0 && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-[var(--down)]/10 text-[var(--down)] border-b border-border">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Không thể cập nhật giá vàng mới ({error instanceof Error ? error.message : "lỗi"}). Đang hiển thị dữ liệu phiên gần nhất.{" "}
            <button onClick={() => refetch()} className="underline font-medium hover:opacity-80">Thử lại</button>
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] sm:text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-1.5 sm:px-4 py-3 font-semibold">Thương hiệu</th>
              <th className="text-left px-2 sm:px-4 py-3 font-semibold hidden sm:table-cell">Loại vàng</th>
              <th className="text-right px-1.5 sm:px-4 py-3 font-semibold hidden min-[440px]:table-cell">Mua</th>
              <th className="text-right px-1.5 sm:px-4 py-3 font-semibold">Bán</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Giá trung bình</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Chênh lệch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((g) => {
              const isUsd = g.unit.includes("USD");
              const decimals = isUsd ? 2 : compact ? 2 : 0;
              const unitSuffix = isUsd ? "/oz" : compact ? " tr/chỉ" : " đ/chỉ";
              const fmt = isUsd
                ? (n: number) => `$${fmtNum(n, 2)}${unitSuffix}`
                : compact
                  ? (n: number) => `${fmtTrieu(n, 2)}${unitSuffix}`
                  : (n: number) => `${fmtNum(n, 0)}${unitSuffix}`;
              const mid = g.mid ?? midOf(g.buy, g.sell);
              return (
                <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-1.5 sm:px-4 py-3 font-semibold min-w-0 max-w-[110px] sm:max-w-none">
                    <Link to="/tai-san/$symbol" params={{ symbol: `gold-${g.id}` }} className="hover:text-gold hover:underline block truncate">
                      {g.brand}
                    </Link>
                    <span className="block text-xs text-muted-foreground truncate sm:hidden">{g.type}</span>
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    <Link to="/tai-san/$symbol" params={{ symbol: `gold-${g.id}` }} className="hover:text-foreground">
                      {g.type}
                    </Link>
                  </td>
                  <td className="px-1.5 sm:px-4 py-3 text-right whitespace-nowrap tabular-nums hidden min-[440px]:table-cell"><AnimatedNumber value={g.buy} format={fmt} /></td>
                  <td className="px-1.5 sm:px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums"><AnimatedNumber value={g.sell} format={fmt} /></td>
                  <td className="px-4 py-3 text-right hidden md:table-cell"><AnimatedNumber value={mid} format={fmt} noFlash minChars={isUsd ? 8 : 7} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell"><AnimatedNumber value={g.sell - g.buy} format={fmt} noFlash minChars={isUsd ? 6 : 5} /></td>
                </tr>
              );
            })}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  {isError ? (
                    <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-6 w-6 text-[var(--down)]" />
                      <p className="text-sm">Không thể tải dữ liệu giá vàng.</p>
                      <p className="text-xs opacity-70">{error instanceof Error ? error.message : ""}</p>
                      <button onClick={() => refetch()} className="mt-2 px-3 py-1.5 text-xs rounded-md bg-gold/15 text-gold font-medium hover:bg-gold/25 transition-colors">
                        Thử lại
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Không tìm thấy kết quả phù hợp.</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}