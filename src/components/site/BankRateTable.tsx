import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, Landmark, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fetchBankRates } from "@/lib/services/bankRateService";
import { fmtNum, fmtDate, fmtTime } from "@/lib/format";
import { SectionCard } from "./SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export function BankRateTable() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["bank-rates"],
    queryFn: fetchBankRates,
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (!q) return items;
    const s = q.toLowerCase();
    return items.filter((r) => r.code.toLowerCase().includes(s) || r.name.toLowerCase().includes(s));
  }, [data, q]);

  const updatedAt = data?.updatedAt;
  const totalItems = data?.items.length ?? 0;
  const showStaleBanner = isError && totalItems > 0;
  const showErrorOnly = isError && totalItems === 0;

  const meta = (
    <span className="flex items-center gap-2">
      {updatedAt ? <span>Cập nhật {fmtDate(updatedAt)} · {fmtTime(updatedAt)}</span> : undefined}
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
      id="bank-rates"
      icon={<Landmark className="h-4 w-4" />}
      title="Tỷ giá Ngân hàng Vietcombank"
      description="Tỷ giá niêm yết chính thức từ Vietcombank • cập nhật mỗi 10 phút"
      meta={meta}
    >
      {showStaleBanner && (
        <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-[var(--down)]/10 text-[var(--down)] border-b border-border">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Không thể cập nhật tỷ giá mới ({error instanceof Error ? error.message : "lỗi không xác định"}). Đang hiển thị dữ liệu phiên gần nhất.{" "}
            <button onClick={() => refetch()} className="underline font-medium hover:opacity-80">Thử lại</button>
          </span>
        </div>
      )}
      <div className="px-4 py-3 border-b border-border">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm USD, EUR, JPY..."
          className="max-w-xs h-9 text-sm"
          disabled={showErrorOnly}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Mã</th>
              <th className="text-left px-4 py-3 font-semibold">Tiền tệ</th>
              <th className="text-right px-4 py-3 font-semibold">Mua tiền mặt</th>
              <th className="text-right px-4 py-3 font-semibold">Mua CK</th>
              <th className="text-right px-4 py-3 font-semibold">Bán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((r) => (
              <tr key={r.code} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-bold text-gold">
                  <Link to="/tai-san/$symbol" params={{ symbol: `bank-${r.code.toLowerCase()}` }} className="hover:underline">
                    {r.code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <Link to="/tai-san/$symbol" params={{ symbol: `bank-${r.code.toLowerCase()}` }} className="hover:text-foreground">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular">{r.cash ? fmtNum(r.cash, 2) : "—"}</td>
                <td className="px-4 py-3 text-right tabular">{r.transfer ? fmtNum(r.transfer, 2) : "—"}</td>
                <td className="px-4 py-3 text-right tabular font-semibold">{r.sell ? fmtNum(r.sell, 2) : "—"}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && !showErrorOnly && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {q ? `Không tìm thấy ngoại tệ phù hợp với "${q}".` : "Không có dữ liệu tỷ giá."}
                </td>
              </tr>
            )}
            {showErrorOnly && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 text-[var(--down)]" />
                    <p className="text-sm">Không thể tải dữ liệu tỷ giá Vietcombank.</p>
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
