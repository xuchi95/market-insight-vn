import { useEffect, useState, useMemo } from "react";
import { Star, X, Plus, ArrowUpRight, ChevronDown } from "lucide-react";
import { useWatchlist, type WatchItem } from "@/hooks/useWatchlist";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import type { CryptoCoin, ForexRate, GoldPrice } from "@/lib/services/types";
import { useNumberFormat } from "@/hooks/useNumberFormat";
import { fmtSmartVND, fmtSmartUSD } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Quote = {
  priceLabel: string;
  unit: string;
  changePct: number | null;
};

const QUICK_ADD: WatchItem[] = [
  { symbol: "gold-sjc-1l", label: "Vàng SJC 1L", category: "Vàng", to: "/tai-san/gold-sjc-1l" },
  { symbol: "BTC", label: "Bitcoin", category: "Tiền điện tử", to: "/tai-san/btc" },
  { symbol: "USD", label: "USD/VND", category: "Ngoại tệ", to: "/tai-san/usd" },
];

const COMPACT_LIMIT = 5;

export function WatchlistPanel({ compact: compactMode = false }: { compact?: boolean } = {}) {
  const { list, add, remove, isWatched, synced } = useWatchlist();
  const { compact } = useNumberFormat();
  const [gold, setGold] = useState<GoldPrice[]>([]);
  const [crypto, setCrypto] = useState<CryptoCoin[]>([]);
  const [fx, setFx] = useState<ForexRate[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [g, c, f] = await Promise.all([
        fetchGoldPrices().catch(() => []),
        fetchCryptoPrices().catch(() => []),
        fetchForexRates().catch(() => []),
      ]);
      if (!alive) return;
      setGold(g);
      setCrypto(c);
      setFx(f);
      setLoadingPrices(false);
      // Cập nhật ngầm — không bắn toast định kỳ để tránh spam UI.
      // Trạng thái "vừa làm mới" được phản ánh qua `lastUpdated` ở UI.
      setLastUpdated(Date.now());
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const resolveQuote = useMemo(() => {
    return (item: WatchItem): Quote | null => {
      const sym = item.symbol.toLowerCase();
      const goldKey = sym.startsWith("gold-") ? sym.slice("gold-".length) : sym;
      const g = gold.find((x) => x.id.toLowerCase() === goldKey);
      if (g) {
        const mid = g.mid ?? (g.buy + g.sell) / 2;
        // Compact mode: show price in "triệu ₫" / "tỷ ₫" matching the
        // header toggle. The VND symbol is already in the formatted label,
        // so strip the per-unit suffix into `unit` (e.g. "/chỉ").
        return {
          priceLabel: fmtSmartVND(mid, compact),
          unit: compact ? `/${g.unit.toLowerCase()}` : `${g.unit}`,
          changePct: g.changePct,
        };
      }
      const c = crypto.find((x) => x.symbol.toLowerCase() === sym || x.id.toLowerCase() === sym);
      if (c) return { priceLabel: fmtSmartUSD(c.priceUsd, compact), unit: "", changePct: c.change24h };
      const f = fx.find((x) => x.code.toLowerCase() === sym);
      if (f) return { priceLabel: fmtSmartVND(f.mid, compact), unit: "", changePct: f.changePct };
      return null;
    };
  }, [gold, crypto, fx, compact]);

  const isEmpty = list.length === 0;
  const overflow = compactMode && !expanded && list.length > COMPACT_LIMIT;
  const visibleList = overflow ? list.slice(0, COMPACT_LIMIT) : list;
  const hiddenCount = list.length - COMPACT_LIMIT;

  const allOptions = useMemo<WatchItem[]>(() => {
    const goldOpts: WatchItem[] = gold.map((g) => ({
      symbol: `gold-${g.id.toLowerCase()}`,
      label: `${g.brand} ${g.type}`.trim(),
      category: "Vàng",
      to: `/tai-san/gold-${g.id.toLowerCase()}`,
    }));
    const cryptoOpts: WatchItem[] = crypto.map((c) => ({
      symbol: c.symbol.toUpperCase(),
      label: c.name,
      category: "Tiền điện tử",
      to: `/tai-san/${c.symbol.toLowerCase()}`,
    }));
    const fxOpts: WatchItem[] = fx.map((f) => ({
      symbol: f.code.toUpperCase(),
      label: `${f.code}/VND — ${f.name}`,
      category: "Ngoại tệ",
      to: `/tai-san/${f.code.toLowerCase()}`,
    }));
    return [...goldOpts, ...cryptoOpts, ...fxOpts];
  }, [gold, crypto, fx]);

  const grouped = useMemo(() => {
    const groups: Record<string, WatchItem[]> = {
      "Vàng": [],
      "Tiền điện tử": [],
      "Ngoại tệ": [],
    };
    for (const opt of allOptions) {
      if (isWatched(opt.symbol)) continue;
      (groups[opt.category] ||= []).push(opt);
    }
    return groups;
  }, [allOptions, isWatched]);

  const handlePick = async (item: WatchItem) => {
    await add(item);
  };

  const Picker = (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] border border-[var(--gold)]/60 shadow-[0_6px_16px_-8px_color-mix(in_oklab,var(--gold)_70%,transparent)] hover:-translate-y-px hover:shadow-[0_10px_22px_-8px_color-mix(in_oklab,var(--gold)_75%,transparent)] active:translate-y-0 transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} /> Thêm tài sản
        </button>
      </DialogTrigger>
      <DialogContent className="p-0 overflow-hidden max-w-lg">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="font-display text-lg tracking-tight">Chọn tài sản theo dõi</DialogTitle>
          <DialogDescription className="text-xs">
            Tìm theo mã, tên, hoặc danh mục (vàng, crypto, ngoại tệ).
          </DialogDescription>
        </DialogHeader>
        <Command className="border-t border-border">
          <CommandInput placeholder="Ví dụ: BTC, vàng, EUR…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>Không có kết quả.</CommandEmpty>
            {(Object.keys(grouped) as Array<keyof typeof grouped>).map((cat) => {
              const items = grouped[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <CommandGroup key={cat} heading={cat}>
                  {items.map((opt) => (
                    <CommandItem
                      key={`${cat}-${opt.symbol}`}
                      value={`${opt.symbol} ${opt.label} ${cat}`}
                      onSelect={() => {
                        void handlePick(opt);
                      }}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex min-w-[52px] justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                          {opt.symbol}
                        </span>
                        <span className="truncate text-sm">{opt.label}</span>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            {allOptions.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Đang tải danh sách tài sản…
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-[0_1px_2px_color-mix(in_oklab,var(--foreground)_4%,transparent),0_10px_26px_-14px_color-mix(in_oklab,var(--foreground)_18%,transparent),0_30px_60px_-40px_color-mix(in_oklab,var(--foreground)_22%,transparent)]">
      {/* Header */}
      <header className="relative flex flex-wrap items-center justify-between gap-4 px-5 md:px-6 py-5 bg-[radial-gradient(420px_120px_at_14%_-40%,color-mix(in_oklab,var(--gold)_12%,transparent),transparent)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid place-items-center h-11 w-11 rounded-[13px] flex-none border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] shadow-[inset_0_1px_0_color-mix(in_oklab,white_60%,transparent)]">
            <Star className="h-5 w-5 fill-[var(--gold-foreground)] text-[var(--gold-foreground)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-display text-[17px] font-semibold tracking-tight">Danh sách theo dõi</span>
              {synced && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-[3px] rounded-full border border-[var(--up)]/30 bg-[color-mix(in_oklab,var(--up)_14%,transparent)] text-[var(--up)]">
                  <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--up)]">
                    <span className="absolute inset-[-3px] rounded-full bg-[var(--up)] opacity-35 animate-ping" />
                  </span>
                  Đã đồng bộ
                </span>
              )}
              {!synced && (
                <span className="text-[11px] font-medium px-2 py-[3px] rounded-full border border-border bg-muted text-muted-foreground">
                  Cục bộ
                </span>
              )}
            </div>
            {!isEmpty && (
              <div className="text-xs text-muted-foreground mt-1 tabular">
                {list.length} tài sản · {loadingPrices && !lastUpdated ? "đang tải…" : "cập nhật vừa rồi"}
              </div>
            )}
          </div>
        </div>
        <div className="flex-none">{Picker}</div>
      </header>

      {isEmpty ? (
        <div className="px-4 md:px-5 py-6">
          <p className="text-sm text-muted-foreground mb-3">
            Thêm tài sản phổ biến hoặc nhấn <span className="text-[var(--gold)] font-medium">“Thêm tài sản”</span> để tìm vàng, crypto, ngoại tệ:
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ADD.map((q) => (
              <button
                key={q.symbol}
                type="button"
                onClick={() => void add(q)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {q.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Column header */}
          <div className="hidden md:grid grid-cols-[52px_minmax(0,1fr)_auto_auto] gap-4 items-center px-5 md:px-6 py-3 border-y border-border bg-[color-mix(in_oklab,var(--gold)_3%,transparent)]">
            <span />
            <span className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-muted-foreground">Tài sản</span>
            <span className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-muted-foreground text-right">Giá hiện tại</span>
            <span className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-muted-foreground text-right">24 giờ</span>
          </div>

          <ul>
            {visibleList.map((item) => {
              const q = resolveQuote(item);
              const change = q?.changePct ?? 0;
              const up = change >= 0;
              const tileGradient =
                item.category === "Vàng"
                  ? "bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] text-[var(--gold-foreground)]"
                  : item.category === "Tiền điện tử"
                  ? "bg-gradient-to-br from-[color-mix(in_oklab,var(--chart-4)_85%,white)] to-[var(--chart-4)] text-white"
                  : "bg-gradient-to-br from-[color-mix(in_oklab,var(--chart-5)_85%,white)] to-[var(--chart-5)] text-white";
              const dotColor =
                item.category === "Vàng"
                  ? "bg-[var(--gold)]"
                  : item.category === "Tiền điện tử"
                  ? "bg-[var(--chart-4)]"
                  : "bg-[var(--chart-5)]";
              return (
                <li
                  key={item.symbol}
                  className="group grid grid-cols-[46px_minmax(0,1fr)] md:grid-cols-[52px_minmax(0,1fr)_auto_auto] gap-x-3 gap-y-2 md:gap-4 items-center px-4 md:px-6 py-4 border-b border-border/60 last:border-b-0 transition-colors hover:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--gold)_6%,transparent),color-mix(in_oklab,var(--gold)_1.5%,transparent))]"
                >
                  {/* Tile */}
                  <div className={`relative h-[46px] w-[46px] rounded-[14px] grid place-items-center font-bold text-[12px] tracking-wide overflow-hidden shadow-[inset_0_1px_0_color-mix(in_oklab,white_40%,transparent),0_3px_8px_-4px_color-mix(in_oklab,var(--foreground)_30%,transparent)] row-span-2 md:row-span-1 ${tileGradient}`}>
                    <span className="relative z-10 px-1 truncate max-w-full">{item.symbol.slice(0, 4)}</span>
                    <span className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_22%,color-mix(in_oklab,white_45%,transparent),transparent_60%)] pointer-events-none" />
                  </div>

                  {/* Name */}
                  <div className="min-w-0">
                    <a
                      href={item.to}
                      className="block truncate text-[14.5px] font-semibold tracking-tight text-foreground hover:text-[var(--gold)] transition-colors"
                    >
                      {item.label}
                    </a>
                    <div className="flex items-center gap-1.5 mt-1 text-[12px] text-muted-foreground min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="truncate">{item.category}</span>
                      <span className="opacity-50">·</span>
                      <span className="tabular text-[10.5px] font-semibold tracking-wider uppercase opacity-80 truncate">{item.symbol}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-start-2 md:col-start-auto text-left md:text-right tabular whitespace-nowrap min-w-0">
                    {q ? (
                      <>
                        <div className="text-[15px] font-bold tracking-tight text-foreground truncate">
                          {q.priceLabel}
                          {q.unit && <span className="ml-0.5 text-[11.5px] font-semibold text-muted-foreground">{q.unit}</span>}
                        </div>
                      </>
                    ) : loadingPrices ? (
                      <Skeleton className="h-4 w-20 ml-auto" />
                    ) : (
                      <div className="text-xs text-muted-foreground italic">—</div>
                    )}
                  </div>

                  {/* Change pill + remove */}
                  <div className="col-start-2 row-start-3 md:row-start-auto md:col-start-auto flex items-center gap-1.5 justify-start md:justify-end -mt-1 md:mt-0">
                    {q && q.changePct !== null ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[9px] text-[12.5px] font-bold tabular tracking-tight ${
                          up
                            ? "text-[var(--up)] bg-[color-mix(in_oklab,var(--up)_14%,transparent)]"
                            : "text-[var(--down)] bg-[color-mix(in_oklab,var(--down)_14%,transparent)]"
                        }`}
                      >
                        <span aria-hidden className="text-[0.7em] leading-none">{up ? "▲" : "▼"}</span>
                        {Math.abs(change).toFixed(2)}%
                      </span>
                    ) : loadingPrices ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    <button
                      type="button"
                      onClick={() => void remove(item.symbol)}
                      aria-label={`Xoá ${item.label}`}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {overflow && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-center gap-1.5 border-t border-border px-5 md:px-6 py-3 text-[13px] font-semibold text-[var(--gold)] hover:bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] transition-colors"
            >
              Xem tất cả ({hiddenCount} tài sản khác)
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="flex justify-end border-t border-border px-5 md:px-6 py-3.5 bg-[color-mix(in_oklab,var(--gold)_2.5%,transparent)]">
            <a
              href="/cai-dat/canh-bao"
              className="group/link inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--gold)] hover:text-[var(--gold-light)] transition-all"
            >
              Quản lý cảnh báo
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}