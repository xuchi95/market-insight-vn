import { useQuery } from "@tanstack/react-query";
import { Fuel, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SectionCard } from "./SectionCard";
import { ChangeBadge } from "./ChangeBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNum, fmtTime } from "@/lib/format";
import { useQueryErrorToast } from "@/hooks/useQueryErrorToast";

interface OilItem {
  id: string;
  symbol: string;
  name: string;
  nameVi: string;
  exchange: string;
  priceUsd: number;
  prevClose: number;
  changeAbs: number;
  changePct: number;
  updatedAt: number;
}

async function fetchOil(): Promise<{ items: OilItem[]; updatedAt: number }> {
  const res = await fetch(`/api/public/oil?t=${Date.now()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`oil ${res.status}`);
  const j = await res.json();
  return { items: j.items ?? [], updatedAt: j.updatedAt ?? Date.now() };
}

export function OilPriceTable() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["oil"],
    queryFn: fetchOil,
    // Giá xăng đổi theo kỳ điều hành 7 ngày — 10 phút thừa tươi.
    refetchInterval: 10 * 60_000,
    refetchIntervalInBackground: false,
    staleTime: 55_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  useQueryErrorToast(isError, error, "giá dầu");

  const items = data?.items ?? [];

  return (
    <SectionCard
      id="oil"
      icon={<Fuel className="h-4 w-4" />}
      title="Giá dầu thế giới"
      action={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          {data?.updatedAt ? `Cập nhật ${fmtTime(data.updatedAt)}` : "Tải lại"}
        </button>
      }
    >
      {isError && (
        <div className="m-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div>
            <div className="font-medium">Không tải được giá dầu</div>
            <div className="text-xs text-muted-foreground">Yahoo Finance tạm thời không phản hồi — thử lại sau ít phút.</div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold tracking-wider">Loại dầu</th>
              <th className="text-left px-4 py-3 font-semibold tracking-wider hidden sm:table-cell">Sàn</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">USD/thùng</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider hidden md:table-cell">Đóng cửa trước</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">Thay đổi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading &&
              Array.from({ length: 2 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-4"><Skeleton className="h-7 w-full" /></td>
                </tr>
              ))}
            {items.map((o) => {
              const up = o.changePct >= 0;
              const to = `/tai-san/oil-${o.id}`;
              return (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-4">
                    <Link to="/tai-san/$symbol" params={{ symbol: `oil-${o.id}` }} className="block">
                      <div className="font-display text-lg tracking-tight hover:text-gold">{o.nameVi}</div>
                      <div className="text-xs text-muted-foreground font-mono">{o.symbol}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">{o.exchange}</td>
                  <td className="px-4 py-4 text-right tabular font-display text-xl tracking-tight">
                    ${fmtNum(o.priceUsd, 2)}
                  </td>
                  <td className="px-4 py-4 text-right tabular text-base text-muted-foreground hidden md:table-cell">
                    ${fmtNum(o.prevClose, 2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <ChangeBadge value={o.changePct} />
                      <span className={`text-xs tabular ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                        {up ? "+" : ""}{fmtNum(o.changeAbs, 2)} USD
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !isError && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Chưa có dữ liệu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}