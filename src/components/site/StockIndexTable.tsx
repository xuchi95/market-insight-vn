import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, LineChart, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["stocks-indices"],
    queryFn: fetchStockIndices,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
  const rows = data ?? [];
  const updatedAt = rows.length ? Math.max(...rows.map((r) => r.updatedAt)) : 0;
  const showStaleBanner = isError && rows.length > 0;
  const showErrorOnly = isError && rows.length === 0;

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
      {showStaleBanner && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-[var(--down)]/10 text-[var(--down)] border-b border-border">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Không thể cập nhật dữ liệu mới ({error instanceof Error ? error.message : "lỗi không xác định"}). Đang hiển thị dữ liệu phiên gần nhất.{" "}
            <button onClick={() => refetch()} className="underline font-medium hover:opacity-80">Thử lại</button>
          </span>
        </div>
      )}
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
                  <td className="px-4 py-3 font-bold">
                    <Link to="/asset/$symbol" params={{ symbol: r.code.toLowerCase() }} className="text-gold hover:underline">
                      {r.name}
                    </Link>
                  </td>
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
            {!isLoading && rows.length === 0 && !showErrorOnly && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Không có dữ liệu chỉ số trong phiên này.</td></tr>
            )}
            {showErrorOnly && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 text-[var(--down)]" />
                    <p className="text-sm">Không thể tải dữ liệu chỉ số chứng khoán.</p>
                    <p className="text-xs opacity-70">{error instanceof Error ? error.message : ""}</p>
                    <button onClick={() => refetch()} className="mt-2 px-3 py-1.5 text-xs rounded-md bg-gold/15 text-gold font-medium hover:bg-gold/25 transition-colors">
                      Thử lại
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
