import { useEffect, useState, useMemo } from "react";
import { Star, X, Plus, ArrowUpRight } from "lucide-react";
import { useWatchlist, type WatchItem } from "@/hooks/useWatchlist";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import type { CryptoCoin, ForexRate, GoldPrice } from "@/lib/services/types";
import { useNumberFormat } from "@/hooks/useNumberFormat";
import { fmtSmartVND, fmtSmartUSD } from "@/lib/format";
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
  { symbol: "sjc-1l", label: "Vàng SJC 1L", category: "Vàng", to: "/tai-san/sjc-1l" },
  { symbol: "BTC", label: "Bitcoin", category: "Tiền điện tử", to: "/tai-san/btc" },
  { symbol: "USD", label: "USD/VND", category: "Ngoại tệ", to: "/tai-san/usd" },
];

export function WatchlistPanel() {
  const { list, add, remove, isWatched, synced } = useWatchlist();
  const { compact } = useNumberFormat();
  const [gold, setGold] = useState<GoldPrice[]>([]);
  const [crypto, setCrypto] = useState<CryptoCoin[]>([]);
  const [fx, setFx] = useState<ForexRate[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      const g = gold.find((x) => x.id.toLowerCase() === sym);
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

  const allOptions = useMemo<WatchItem[]>(() => {
    const goldOpts: WatchItem[] = gold.map((g) => ({
      symbol: g.id,
      label: `${g.brand} ${g.type}`.trim(),
      category: "Vàng",
      to: `/tai-san/${g.id.toLowerCase()}`,
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
    <div className="rounded-2xl border border-border bg-card/40">
      <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-[var(--gold)]" />
          <h3 className="font-display text-lg tracking-tight">Danh sách theo dõi</h3>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
              synced
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {synced ? "Đã đồng bộ" : "Cục bộ"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isEmpty && (
            <span className="text-xs text-muted-foreground">{list.length} tài sản</span>
          )}
          {Picker}
        </div>
      </div>

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
          <ul className="divide-y divide-border">
            {list.map((item) => {
              const q = resolveQuote(item);
              const change = q?.changePct ?? 0;
              const up = change >= 0;
              return (
                <li key={item.symbol} className="group flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-accent/40 transition-colors">
                  <span className="inline-flex min-w-[52px] justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                    {item.symbol}
                  </span>
                  <div className="flex-1 min-w-0">
                    <a href={item.to} className="block truncate text-sm font-medium text-foreground hover:text-[var(--gold)]">
                      {item.label}
                    </a>
                    <div className="text-[11px] text-muted-foreground">{item.category}</div>
                  </div>
                  <div className="text-right">
                    {q ? (
                      <>
                        <div className="tabular text-sm font-semibold text-foreground">
                          {q.priceLabel}
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">{q.unit}</span>
                        </div>
                        {q.changePct !== null && (
                          <div className={`tabular text-[11px] font-medium ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                            <span aria-hidden className="text-[0.7em]">{up ? "▲" : "▼"}</span>
                            {" "}
                            {Math.abs(change).toFixed(2)}%
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">—</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(item.symbol)}
                    className="ml-1 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border px-4 md:px-5 py-2.5 text-right">
            <a
              href="/cai-dat/canh-bao"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-[var(--gold)]"
            >
              Quản lý cảnh báo <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}