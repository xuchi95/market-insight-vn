import { useMemo } from "react";
import { AlertTriangle, DollarSign, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fmtNum, fmtTime } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";
import { SectionCard, LiveDot } from "./SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/hooks/useQueryErrorToast";
import { useCompactView } from "@/hooks/useCompactView";
import { CompactViewToggle } from "./CompactViewToggle";

export function ForexRateTable({ search }: { search?: string }) {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt, isError, error } = useQuery({
    queryKey: ["forex"],
    queryFn: fetchForexRates,
    refetchInterval: 10 * 60 * 1000,
  });
  useQueryErrorToast(isError, error, "tỷ giá ngoại tệ");
  const { colCls, isColVisible } = useCompactView();
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
      meta={<><LiveDot /> Cập nhật {dataUpdatedAt ? fmtTime(dataUpdatedAt) : "—"}</>}
      action={<Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} /></Button>}
    >
      <div className="flex items-center justify-end px-3 pt-2 md:hidden">
        <CompactViewToggle />
      </div>
      {isError && (data?.length ?? 0) > 0 && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-[var(--down)]/10 text-[var(--down)] border-b border-border">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Không thể cập nhật tỷ giá mới ({error instanceof Error ? error.message : "lỗi"}). Đang hiển thị dữ liệu phiên gần nhất.{" "}
            <button onClick={() => refetch()} className="underline font-medium hover:opacity-80">Thử lại</button>
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] sm:text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-1.5 sm:px-4 py-3 font-semibold">Mã</th>
              <th className={`text-left px-2 sm:px-4 py-3 font-semibold ${colCls("sm")}`}>Tiền tệ</th>
              <th className="text-right px-1.5 sm:px-4 py-3 font-semibold">Mua</th>
              <th className="text-right px-1.5 sm:px-4 py-3 font-semibold">Bán</th>
              <th className={`text-right px-4 py-3 font-semibold ${colCls("md")}`}>Trung bình</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((r) => (
              <tr key={r.code} className="hover:bg-muted/30 transition-colors">
                <td className="px-1.5 sm:px-4 py-3 font-bold min-w-0 max-w-[88px] sm:max-w-none">
                  <Link to="/tai-san/$symbol" params={{ symbol: r.code.toLowerCase() }} className="text-gold hover:underline block truncate">
                    {r.code}
                  </Link>
                  <span className="block text-xs font-normal text-muted-foreground truncate sm:hidden">{r.name}</span>
                </td>
                <td className={`px-2 sm:px-4 py-3 text-muted-foreground ${colCls("sm")}`}>
                  <Link to="/tai-san/$symbol" params={{ symbol: r.code.toLowerCase() }} className="hover:text-foreground">
                    {r.name}
                  </Link>
                </td>
                <td className="px-1.5 sm:px-4 py-3 text-right whitespace-nowrap tabular-nums"><AnimatedNumber value={r.buy} format={(v) => fmtNum(v, 2)} /></td>
                <td className="px-1.5 sm:px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums"><AnimatedNumber value={r.sell} format={(v) => fmtNum(v, 2)} /></td>
                <td className={`px-4 py-3 text-right text-muted-foreground ${colCls("md")}`}>
                  {isColVisible("md") ? (
                    <AnimatedNumber value={r.mid} format={(v) => fmtNum(v, 2)} noFlash minChars={9} />
                  ) : (
                    <span className="tabular">{fmtNum(r.mid, 2)}</span>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  {isError ? (
                    <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-6 w-6 text-[var(--down)]" />
                      <p className="text-sm">Không thể tải dữ liệu tỷ giá ngoại tệ.</p>
                      <p className="text-xs opacity-70">{error instanceof Error ? error.message : ""}</p>
                      <button onClick={() => refetch()} className="mt-2 px-3 py-1.5 text-xs rounded-md bg-gold/15 text-gold font-medium hover:bg-gold/25 transition-colors">
                        Thử lại
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Không tìm thấy tiền tệ phù hợp.</span>
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