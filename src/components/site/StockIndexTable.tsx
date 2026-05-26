import { useQuery } from "@tanstack/react-query";
import { LineChart, Loader2 } from "lucide-react";
import { fetchStockIndices } from "@/lib/services/stockIndexService";
import { fmtNum, fmtDate, fmtTime } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { SectionCard } from "./SectionCard";
import { Skeleton } from "@/components/ui/skeleton";

function fmtVol(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " triệu";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " nghìn";
  return fmtNum(n, 0);
}

export function StockIndexTable() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["stocks-indices"],
    queryFn: fetchStockIndices,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60_000,
  });
  const rows = data ?? [];
  const updatedAt = rows.length ? Math.max(...rows.map((r) => r.updatedAt)) : 0;

  const meta = (
    <span className="flex items-center gap-2">
      {updatedAt > 0 && (
        <span>Cập nhật {fmtDate(updatedAt)} · {fmtTime(updatedAt)}</span>
      )}
      {isFetching && !isLoading && (
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--up)] animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang cập nhật…
        </span>
      )}
    </span>
  );

  return (
    <SectionCard
      id="stock-indices"
      icon={<LineChart className="h-4 w-4" />}
      title="Chỉ số chứng khoán Việt Nam"
      description="VN-Index, VN30, HNX, UPCOM • cập nhật mỗi 5 phút • nguồn: VNDirect"
      meta={meta}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Chỉ số</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Sàn</th>
              <th className="text-right px-4 py-3 font-semibold">Điểm</th>
              <th className="text-right px-4 py-3 font-semibold">Thay đổi</th>
              <th className="text-right px-4 py-3 font-semibold">%</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Cao</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Thấp</th>
              <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">KLGD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((r) => {
              const up = r.change >= 0;
              return (
                <tr key={r.code} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-gold">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.exchange}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{fmtNum(r.value, 2)}</td>
                  <td className={`px-4 py-3 text-right tabular ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                    {up ? "+" : ""}{fmtNum(r.change, 2)}
                  </td>
                  <td className="px-4 py-3 text-right"><ChangeBadge value={r.changePct} /></td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground hidden md:table-cell">{fmtNum(r.high, 2)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground hidden md:table-cell">{fmtNum(r.low, 2)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground hidden lg:table-cell">{fmtVol(r.volume)}</td>
                </tr>
              );
            })}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Không có dữ liệu chỉ số.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
