import { useMemo } from "react";
import { DollarSign, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fmtNum, fmtTime } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { SectionCard, LiveDot } from "./SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ForexRateTable({ search }: { search?: string }) {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["forex"],
    queryFn: fetchForexRates,
    refetchInterval: 10 * 60 * 1000,
  });
  const rows = useMemo(() => {
    let r = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
    }
    return r;
  }, [data, search]);

  return (
    <SectionCard
      id="forex"
      icon={<DollarSign className="h-4 w-4" />}
      title="Tỷ giá ngoại tệ"
      description="Quy đổi 1 đơn vị ngoại tệ sang VND • cập nhật mỗi 10 phút"
      meta={<><LiveDot /> Cập nhật {dataUpdatedAt ? fmtTime(dataUpdatedAt) : "—"}</>}
      action={<Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} /></Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Mã</th>
              <th className="text-left px-4 py-3 font-semibold">Tiền tệ</th>
              <th className="text-right px-4 py-3 font-semibold">Mua</th>
              <th className="text-right px-4 py-3 font-semibold">Bán</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Trung bình</th>
              <th className="text-right px-4 py-3 font-semibold">Thay đổi</th>
              <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((r) => (
              <tr key={r.code} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-bold">
                  <Link to="/tai-san/$symbol" params={{ symbol: r.code.toLowerCase() }} className="text-gold hover:underline">
                    {r.code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <Link to="/tai-san/$symbol" params={{ symbol: r.code.toLowerCase() }} className="hover:text-foreground">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtNum(r.buy, 2)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtNum(r.sell, 2)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">{fmtNum(r.mid, 2)}</td>
                <td className="px-4 py-3 text-right"><ChangeBadge value={r.changePct} /></td>
                <td className="px-4 py-3 text-right text-sm text-muted-foreground tabular-nums hidden lg:table-cell">{fmtTime(r.updatedAt)}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Không tìm thấy tiền tệ phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}