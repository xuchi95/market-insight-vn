import { useMemo, useState } from "react";
import { AlertTriangle, Bitcoin, RefreshCw, ArrowUpDown, Trophy, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fmtCompactUSD, fmtTime, fmtUSD, fmtVND, fmtSmartUSD, fmtSmartVND } from "@/lib/format";
import { useNumberFormat } from "@/hooks/useNumberFormat";
import { AnimatedNumber } from "./AnimatedNumber";
import { ChangeBadge } from "./ChangeBadge";
import { Sparkline } from "./Sparkline";
import { SectionCard, LiveDot } from "./SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/hooks/useQueryErrorToast";
import { useAuth } from "@/hooks/useAuth";
import { LockedDataPanel } from "./LockedDataPanel";

type SortKey = "marketCap" | "priceUsd" | "priceVnd" | "change24h" | "volume24h";
type Category = "all" | "top-mcap" | "top-volume";

const CATEGORY_LABELS: Record<Category, string> = {
  all: "Tất cả",
  "top-mcap": "Top vốn hoá",
  "top-volume": "Top volume",
};

const SORT_LABELS: Record<SortKey, string> = {
  marketCap: "Vốn hoá",
  priceUsd: "Giá USD",
  priceVnd: "Giá VND",
  change24h: "Biến động 24h",
  volume24h: "Volume 24h",
};

export function CryptoPriceTable({ search }: { search?: string }) {
  const { user } = useAuth();
  const { data, isLoading, refetch, isFetching, dataUpdatedAt, isError, error } = useQuery({
    queryKey: ["crypto"],
    queryFn: () => fetchCryptoPrices(),
    refetchInterval: 60_000,
    enabled: !!user,
  });
  useQueryErrorToast(isError, error, "giá crypto");
  if (!user) {
    return (
      <SectionCard
        id="crypto"
        icon={<Bitcoin className="h-4 w-4" />}
        title="Bảng giá crypto"
        description="Giá thị trường realtime • dành cho thành viên"
      >
        <LockedDataPanel description="Bảng giá crypto realtime, sparkline 7 ngày và bộ lọc nâng cao chỉ hiển thị cho thành viên đã đăng nhập." />
      </SectionCard>
    );
  }
  const { compact } = useNumberFormat();
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortKey>("marketCap");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    let r = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }

    if (category === "top-mcap") {
      r = [...r].sort((a, b) => b.marketCap - a.marketCap).slice(0, 10);
    } else if (category === "top-volume") {
      r = [...r].sort((a, b) => b.volume24h - a.volume24h).slice(0, 10);
    } else {
      r = [...r].sort((a, b) => (dir === "asc" ? a[sort] - b[sort] : b[sort] - a[sort]));
    }
    return r;
  }, [data, search, category, sort, dir]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(k); setDir("desc"); }
  };

  const SortBtn = ({ k, align = "right" }: { k: SortKey; align?: "left" | "right" }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 hover:text-foreground ${align === "right" ? "ml-auto" : ""} ${sort === k ? "text-foreground font-semibold" : "text-muted-foreground"}`}
    >
      {SORT_LABELS[k]} <ArrowUpDown className={`h-3 w-3 ${sort === k ? "text-primary" : ""}`} />
    </button>
  );

  return (
    <SectionCard
      id="crypto"
      icon={<Bitcoin className="h-4 w-4" />}
      title="Bảng giá crypto"
      description="Giá thị trường realtime • cập nhật mỗi 15s"
      meta={<><LiveDot /> Cập nhật {dataUpdatedAt ? fmtTime(dataUpdatedAt) : "—"}</>}
      action={<Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} /></Button>}
    >
      <div className="flex flex-col gap-4 p-4 lg:p-5">
        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "top-mcap", "top-volume"] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                category === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat === "top-mcap" && <Trophy className="h-3 w-3" />}
              {cat === "top-volume" && <BarChart3 className="h-3 w-3" />}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Advanced sort controls (only when not using category presets) */}
        {category === "all" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Sắp xếp theo:</span>
            {(["marketCap", "priceUsd", "priceVnd", "change24h", "volume24h"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border transition-colors ${
                  sort === k
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {SORT_LABELS[k]}
                {sort === k && (dir === "desc" ? " ↓" : " ↑")}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-border">
          {isError && (data?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-[var(--down)]/10 text-[var(--down)] border-b border-border">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Không thể cập nhật giá crypto mới ({error instanceof Error ? error.message : "lỗi"}). Đang hiển thị dữ liệu gần nhất.{" "}
                <button onClick={() => refetch()} className="underline font-medium hover:opacity-80">Thử lại</button>
              </span>
            </div>
          )}
          <table className="w-full text-base">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold w-10">#</th>
                <th className="text-left px-4 py-3 font-semibold">Coin</th>
                <th className="text-right px-4 py-3 font-semibold"><SortBtn k="priceUsd" /></th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell"><SortBtn k="priceVnd" /></th>
                <th className="text-right px-4 py-3 font-semibold"><SortBtn k="change24h" /></th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell"><SortBtn k="marketCap" /></th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell"><SortBtn k="volume24h" /></th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">7d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
              ))}
              {rows.map((c, i) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link to="/tai-san/$symbol" params={{ symbol: c.symbol.toLowerCase() }} className="flex items-center gap-3 group">
                      <img src={c.image} alt={c.name} className="h-7 w-7 rounded-full" loading="lazy" />
                      <div>
                        <div className="font-semibold group-hover:text-gold transition-colors">{c.name}</div>
                        <div className="text-sm text-muted-foreground">{c.symbol}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <AnimatedNumber
                      value={c.priceUsd}
                      minChars={10}
                      format={(v) => fmtSmartUSD(v, compact, c.priceUsd < 1 ? 4 : 2)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                    <AnimatedNumber
                      value={c.priceVnd}
                      minChars={14}
                      noFlash
                      format={(v) => fmtSmartVND(v, compact)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right"><ChangeBadge value={c.change24h} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                    <AnimatedNumber
                      value={c.marketCap}
                      minChars={9}
                      noFlash
                      format={(v) => (compact ? fmtCompactUSD(v) : fmtUSD(v, 0))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                    <AnimatedNumber
                      value={c.volume24h}
                      minChars={9}
                      noFlash
                      format={(v) => (compact ? fmtCompactUSD(v) : fmtUSD(v, 0))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell"><div className="inline-block"><Sparkline data={c.sparkline} /></div></td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    {isError ? (
                      <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-6 w-6 text-[var(--down)]" />
                        <p className="text-sm">Không thể tải dữ liệu giá crypto.</p>
                        <p className="text-xs opacity-70">{error instanceof Error ? error.message : ""}</p>
                        <button onClick={() => refetch()} className="mt-2 px-3 py-1.5 text-xs rounded-md bg-gold/15 text-gold font-medium hover:bg-gold/25 transition-colors">
                          Thử lại
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Không tìm thấy coin nào.</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}
