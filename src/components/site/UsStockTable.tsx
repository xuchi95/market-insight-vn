import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, Globe, Loader2 } from "lucide-react";
import { fmtNum, fmtDate, fmtTime } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { SectionCard } from "./SectionCard";
import { Skeleton } from "@/components/ui/skeleton";

interface UsStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  exchange: string;
  updatedAt: number;
}

async function fetchUsStocks(): Promise<UsStock[]> {
  const res = await fetch("/api/public/us-stocks", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { items: UsStock[] };
  return data.items ?? [];
}

function fmtVol(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return fmtNum(n, 0);
}

function fmtMcap(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000_000_000) return "$" + (n / 1_000_000_000_000).toFixed(2) + "T";
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  return "$" + fmtNum(n, 0);
}

export function UsStockTable() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["us-stocks"],
    queryFn: fetchUsStocks,
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const rows = data ?? [];
  const updatedAt = rows.length ? Math.max(...rows.map((r) => r.updatedAt)) : 0;
  const showStaleBanner = isError && rows.length > 0;
  const showErrorOnly = isError && rows.length === 0;

  const meta = (
    <span className="flex items-center gap-2">
      {updatedAt > 0 && <span>Cập nhật {fmtDate(updatedAt)} · {fmtTime(updatedAt)}</span>}
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
      id="us-stocks"
      icon={<Globe className="h-4 w-4" />}
      title="Cổ phiếu Mỹ nổi bật"
      description="Big Tech & SPY • cập nhật mỗi giờ • nguồn: Financial Modeling Prep"
      meta={meta}
    >
      {showStaleBanner && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-[var(--down)]/10 text-[var(--down)] border-b border-border">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Không thể cập nhật dữ liệu mới ({error instanceof Error ? error.message : "lỗi"}). Đang hiển thị giá gần nhất.{" "}
            <button onClick={() => refetch()} className="underline font-medium hover:opacity-80">Thử lại</button>
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Mã</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Tên</th>
              <th className="text-right px-4 py-3 font-semibold">Giá (USD)</th>
              <th className="text-right px-4 py-3 font-semibold">%</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Cao</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Thấp</th>
              <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Vốn hoá</th>
              <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">KLGD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((r) => (
              <tr key={r.symbol} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-bold text-gold">{r.symbol}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.name}</td>
                <td className="px-4 py-3 text-right tabular font-semibold">{fmtNum(r.price, 2)}</td>
                <td className="px-4 py-3 text-right"><ChangeBadge value={r.changePct} /></td>
                <td className="px-4 py-3 text-right tabular text-muted-foreground hidden md:table-cell">{fmtNum(r.dayHigh, 2)}</td>
                <td className="px-4 py-3 text-right tabular text-muted-foreground hidden md:table-cell">{fmtNum(r.dayLow, 2)}</td>
                <td className="px-4 py-3 text-right tabular text-muted-foreground hidden lg:table-cell">{fmtMcap(r.marketCap)}</td>
                <td className="px-4 py-3 text-right tabular text-muted-foreground hidden lg:table-cell">{fmtVol(r.volume)}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && !showErrorOnly && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Chưa có dữ liệu.</td></tr>
            )}
            {showErrorOnly && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 text-[var(--down)]" />
                    <p className="text-sm">Không thể tải dữ liệu cổ phiếu Mỹ.</p>
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