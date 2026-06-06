import { useQuery } from "@tanstack/react-query";
import { Gem, AlertTriangle, Loader2 } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { ChangeBadge } from "./ChangeBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNum, fmtTime } from "@/lib/format";
import { useQueryErrorToast } from "@/hooks/useQueryErrorToast";

interface MetalItem {
  symbol: string;
  name: string;
  nameVi: string;
  priceUsd: number;
  changePct: number;
  updatedAt: number;
}

async function fetchMetals(): Promise<{ items: MetalItem[]; updatedAt: number }> {
  const res = await fetch("/api/public/metals", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`metals ${res.status}`);
  const j = await res.json();
  return { items: j.items ?? [], updatedAt: j.updatedAt ?? Date.now() };
}

const GRAM_PER_OZ = 31.1035;

export function MetalsTable() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["metals"],
    queryFn: fetchMetals,
    refetchInterval: 30 * 60 * 1000, // khớp cache server 30'
    staleTime: 25 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  useQueryErrorToast(isError, error, "giá kim loại quý");

  const items = data?.items ?? [];

  return (
    <SectionCard
      id="metals"
      icon={<Gem className="h-4 w-4" />}
      title="Kim loại quý thế giới"
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
            <div className="font-medium">Không tải được dữ liệu kim loại quý</div>
            <div className="text-xs text-muted-foreground">Đã hết hạn mức Metals-API hoặc lỗi mạng — thử lại sau.</div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold tracking-wider">Kim loại</th>
              <th className="text-left px-4 py-3 font-semibold tracking-wider">Mã</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">USD/oz</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider hidden md:table-cell">USD/gram</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">Thay đổi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-4"><Skeleton className="h-7 w-full" /></td>
                </tr>
              ))}
            {items.map((m) => (
              <tr key={m.symbol} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-4 font-display text-lg tracking-tight">{m.nameVi}</td>
                <td className="px-4 py-4 text-sm font-mono uppercase text-muted-foreground tracking-wider">{m.symbol}</td>
                <td className="px-4 py-4 text-right tabular font-display text-xl tracking-tight">${fmtNum(m.priceUsd, 2)}</td>
                <td className="px-4 py-4 text-right tabular text-base text-muted-foreground hidden md:table-cell">
                  ${fmtNum(m.priceUsd / GRAM_PER_OZ, 2)}
                </td>
                <td className="px-4 py-4 text-right"><ChangeBadge value={m.changePct} /></td>
              </tr>
            ))}
            {!isLoading && !isError && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Chưa có dữ liệu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}