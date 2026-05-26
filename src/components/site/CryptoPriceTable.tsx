import { useMemo, useState } from "react";
import { Bitcoin, RefreshCw, ArrowUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fmtCompactUSD, fmtTime, fmtUSD, fmtVND } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { Sparkline } from "./Sparkline";
import { SectionCard, LiveDot } from "./SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "marketCap" | "priceUsd" | "change24h";

export function CryptoPriceTable({ search }: { search?: string }) {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["crypto"],
    queryFn: () => fetchCryptoPrices(),
    refetchInterval: 15000,
  });
  const [sort, setSort] = useState<SortKey>("marketCap");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    let r = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }
    r = [...r].sort((a, b) => (dir === "asc" ? a[sort] - b[sort] : b[sort] - a[sort]));
    return r;
  }, [data, search, sort, dir]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(k); setDir("desc"); }
  };

  const SortBtn = ({ k, label, align = "right" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 hover:text-foreground ${align === "right" ? "ml-auto" : ""}`}>
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <SectionCard
      id="crypto"
      icon={<Bitcoin className="h-4 w-4" />}
      title="Bảng giá crypto"
      description="Dữ liệu trực tiếp từ CoinGecko • cập nhật mỗi 15s"
      meta={<><LiveDot /> Cập nhật {dataUpdatedAt ? fmtTime(dataUpdatedAt) : "—"}</>}
      action={<Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} /></Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold w-10">#</th>
              <th className="text-left px-4 py-3 font-semibold">Coin</th>
              <th className="text-right px-4 py-3 font-semibold"><SortBtn k="priceUsd" label="Giá USD" /></th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Giá VND</th>
              <th className="text-right px-4 py-3 font-semibold"><SortBtn k="change24h" label="24h" /></th>
              <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell"><SortBtn k="marketCap" label="Vốn hoá" /></th>
              <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Volume 24h</th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">7d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {rows.map((c, i) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground tabular">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link to="/asset/$symbol" params={{ symbol: c.symbol.toLowerCase() }} className="flex items-center gap-3 group">
                    <img src={c.image} alt={c.name} className="h-7 w-7 rounded-full" loading="lazy" />
                    <div>
                      <div className="font-semibold group-hover:text-gold transition-colors">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.symbol}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular font-semibold">{fmtUSD(c.priceUsd, c.priceUsd < 1 ? 4 : 2)}</td>
                <td className="px-4 py-3 text-right tabular text-muted-foreground hidden md:table-cell">{fmtVND(c.priceVnd)}</td>
                <td className="px-4 py-3 text-right"><ChangeBadge value={c.change24h} /></td>
                <td className="px-4 py-3 text-right tabular text-muted-foreground hidden lg:table-cell">{fmtCompactUSD(c.marketCap)}</td>
                <td className="px-4 py-3 text-right tabular text-muted-foreground hidden lg:table-cell">{fmtCompactUSD(c.volume24h)}</td>
                <td className="px-4 py-3 text-right hidden md:table-cell"><div className="inline-block"><Sparkline data={c.sparkline} /></div></td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Không tìm thấy coin nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}