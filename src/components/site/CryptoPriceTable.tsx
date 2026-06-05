import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bitcoin,
  RefreshCw,
  ArrowUpDown,
  Trophy,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fmtCompactUSD, fmtUSD, fmtVND, fmtSmartVND } from "@/lib/format";
import { useNumberFormat } from "@/hooks/useNumberFormat";
import { useBinanceTickers } from "@/hooks/useBinanceTicker";
import { AnimatedNumber } from "./AnimatedNumber";
import { ChangeBadge } from "./ChangeBadge";
import { Sparkline } from "./Sparkline";
import { SectionCard } from "./SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/hooks/useQueryErrorToast";

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
  const { data, isLoading, refetch, isFetching, isError, error } = useQuery({
    queryKey: ["crypto"],
    queryFn: () => fetchCryptoPrices(),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  useQueryErrorToast(isError, error, "giá crypto");
  const { compact } = useNumberFormat();
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortKey>("marketCap");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  // Realtime price overlay via Binance WS (throttled to ~10s in the hook)
  const ids = useMemo(() => (data ?? []).map((c) => c.id), [data]);
  const liveTicks = useBinanceTickers(ids);

  const rows = useMemo(() => {
    const usdVnd = data && data.length ? data[0].priceVnd / (data[0].priceUsd || 1) : 25_400;
    let r = (data ?? []).map((c) => {
      const t = liveTicks[c.id];
      if (!t) return c;
      return {
        ...c,
        priceUsd: t.priceUsd,
        priceVnd: t.priceUsd * usdVnd,
        change24h: t.change24h,
        volume24h: t.volume24h || c.volume24h,
      };
    });
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
  }, [data, liveTicks, search, category, sort, dir]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir("desc");
    }
  };

  const stickyThClass =
    "sticky top-[6.5rem] md:top-[7.25rem] z-30 bg-muted/95 backdrop-blur-md border-b border-border";

  const SortBtn = ({
    k,
    align = "right",
    shortLabel,
  }: {
    k: SortKey;
    align?: "left" | "right";
    shortLabel?: string;
  }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground ${align === "right" ? "ml-auto" : ""} ${sort === k ? "text-foreground font-semibold" : "text-muted-foreground"}`}
    >
      {shortLabel ? (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{SORT_LABELS[k]}</span>
        </>
      ) : (
        SORT_LABELS[k]
      )}{" "}
      <ArrowUpDown className={`h-3 w-3 shrink-0 ${sort === k ? "text-primary" : ""}`} />
    </button>
  );

  return (
    <SectionCard
      id="crypto"
      icon={<Bitcoin className="h-4 w-4" />}
      title="Bảng giá crypto"
      action={
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
        </Button>
      }
    >
      <div className="flex flex-col gap-4 p-4 lg:p-5">
        {/* Category filter — sticky to viewport under the site header */}
        <div className="sticky top-12 md:top-14 z-40 -mx-4 lg:-mx-5 px-4 lg:px-5 py-2.5 flex flex-wrap items-center gap-3 bg-card/95 backdrop-blur-md border-b border-border/60 shadow-[0_4px_12px_-8px_rgba(0,0,0,0.4)]">
          {/* Category segmented chips */}
          <div
            role="tablist"
            aria-label="Lọc danh mục crypto"
            className="inline-flex items-stretch rounded-full border border-border bg-muted/40 p-1 shadow-inner"
          >
            {(["all", "top-mcap", "top-volume"] as Category[]).map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(cat)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full h-8 px-4 text-xs font-medium leading-none transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                  }`}
                >
                  {cat === "top-mcap" && <Trophy className="h-3.5 w-3.5" />}
                  {cat === "top-volume" && <BarChart3 className="h-3.5 w-3.5" />}
                  <span>{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

        </div>

        <div className="rounded-lg border border-border overflow-visible">
          {isError && (data?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-[var(--down)]/10 text-[var(--down)] border-b border-border">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Không thể cập nhật giá crypto mới ({error instanceof Error ? error.message : "lỗi"}
                ). Đang hiển thị dữ liệu gần nhất.{" "}
                <button
                  onClick={() => refetch()}
                  className="underline font-medium hover:opacity-80"
                >
                  Thử lại
                </button>
              </span>
            </div>
          )}
          <table className="w-full table-fixed text-sm sm:text-base">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className={`${stickyThClass} text-left px-2 sm:px-4 py-3 font-semibold w-8 sm:w-10`}>
                  #
                </th>
                <th
                  className={`${stickyThClass} text-left px-2 sm:px-4 py-3 font-semibold w-[40%] sm:w-auto`}
                >
                  Coin
                </th>
                <th
                  className={`${stickyThClass} text-right px-2 sm:px-4 py-3 font-semibold w-[34%] sm:w-auto`}
                >
                  <SortBtn k="priceUsd" />
                </th>
                <th
                  className={`${stickyThClass} text-right px-4 py-3 font-semibold hidden md:table-cell`}
                >
                  <SortBtn k="priceVnd" />
                </th>
                <th
                  className={`${stickyThClass} text-right px-2 sm:px-4 py-3 font-semibold w-[22%] sm:w-auto`}
                >
                  <SortBtn k="change24h" shortLabel="24h" />
                </th>
                <th
                  className={`${stickyThClass} text-right px-4 py-3 font-semibold hidden lg:table-cell`}
                >
                  <SortBtn k="marketCap" />
                </th>
                <th
                  className={`${stickyThClass} text-right px-4 py-3 font-semibold hidden lg:table-cell`}
                >
                  <SortBtn k="volume24h" />
                </th>
                <th
                  className={`${stickyThClass} text-right px-4 py-3 font-semibold hidden md:table-cell`}
                >
                  7d
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {rows.map((c, i) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-2 sm:px-4 py-3 text-muted-foreground tabular-nums text-xs sm:text-sm">{i + 1}</td>
                  <td className="px-2 sm:px-4 py-3">
                    <Link
                      to="/tai-san/$symbol"
                      params={{ symbol: c.symbol.toLowerCase() }}
                      className="flex items-center gap-2 sm:gap-3 group min-w-0"
                    >
                      <img
                        src={c.image}
                        alt={c.name}
                        className="h-7 w-7 rounded-full shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold group-hover:text-gold transition-colors truncate">
                          {c.name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">{c.symbol}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-right font-semibold whitespace-nowrap text-sm sm:text-base">
                    <AnimatedNumber
                      value={c.priceUsd}
                      format={(v) => fmtUSD(v, c.priceUsd < 1 ? 4 : 2)}
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
                  <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                    <ChangeBadge value={c.change24h} />
                  </td>
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
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <div className="inline-block">
                      <Sparkline data={c.sparkline} />
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    {isError ? (
                      <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-6 w-6 text-[var(--down)]" />
                        <p className="text-sm">Không thể tải dữ liệu giá crypto.</p>
                        <p className="text-xs opacity-70">
                          {error instanceof Error ? error.message : ""}
                        </p>
                        <button
                          onClick={() => refetch()}
                          className="mt-2 px-3 py-1.5 text-xs rounded-md bg-gold/15 text-gold font-medium hover:bg-gold/25 transition-colors"
                        >
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
