import { useMemo, useState } from "react";
import { ArrowUpDown, Wrench, ChevronDown, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "./SectionCard";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fmtVND, fmtNum, fmtVNDCompact } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AssetKind = "crypto" | "forex" | "gold";
interface AssetOpt {
  key: string;
  label: string;
  kind: AssetKind;
  /** VND per 1 unit, mid */
  rateVnd: number;
  /** VND per 1 unit when user SELLS this asset (bank/exchange buys) */
  buyVnd: number;
  /** VND per 1 unit when user BUYS this asset (bank/exchange sells) */
  sellVnd: number;
}

export function ConverterTool() {
  const liveOpts = {
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  };
  const crypto = useQuery({ queryKey: ["crypto"], queryFn: () => fetchCryptoPrices(), ...liveOpts });
  const forex = useQuery({ queryKey: ["forex"], queryFn: fetchForexRates, ...liveOpts });
  const gold = useQuery({ queryKey: ["gold"], queryFn: fetchGoldPrices, ...liveOpts });

  const assets: AssetOpt[] = useMemo(() => {
    const out: AssetOpt[] = [];
    // VND tham chiếu
    out.push({ key: "vnd", label: "VND — Việt Nam Đồng", kind: "forex", rateVnd: 1, buyVnd: 1, sellVnd: 1 });
    forex.data?.forEach((f) =>
      out.push({ key: `f:${f.code}`, label: `${f.code} — ${f.name}`, kind: "forex", rateVnd: f.mid, buyVnd: f.buy, sellVnd: f.sell }),
    );
    crypto.data?.forEach((c) => {
      // crypto: spread ~0.2%
      const sp = c.priceVnd * 0.001;
      out.push({ key: `c:${c.id}`, label: `${c.symbol} — ${c.name}`, kind: "crypto", rateVnd: c.priceVnd, buyVnd: c.priceVnd - sp, sellVnd: c.priceVnd + sp });
    });
    gold.data?.forEach((g) => {
      if (g.unit.includes("USD")) return;
      out.push({ key: `g:${g.id}`, label: `Vàng ${g.brand} (chỉ)`, kind: "gold", rateVnd: (g.buy + g.sell) / 2, buyVnd: g.buy, sellVnd: g.sell });
    });
    return out;
  }, [crypto.data, forex.data, gold.data]);

  const [from, setFrom] = useState("f:USD");
  const [to, setTo] = useState("vnd");
  const [amount, setAmount] = useState("100");
  const [swapped, setSwapped] = useState(false);

  const swap = () => {
    setSwapped((s) => !s);
    setFrom(to);
    setTo(from);
  };

  const result = useMemo(() => {
    const a = assets.find((x) => x.key === from);
    const b = assets.find((x) => x.key === to);
    const n = parseFloat(amount.replace(/,/g, "")) || 0;
    if (!a || !b || n <= 0) return null;
    const vndFromSelling = a.buyVnd * n;
    const amountB_realistic = vndFromSelling / b.sellVnd;
    return { a, b, n, amountB_realistic, vndFromSelling };
  }, [assets, from, to, amount]);

  const fmtAmount = (v: number, kind: AssetKind, code: string) => {
    if (code === "vnd") return fmtVND(v);
    const dp = kind === "crypto" ? (v < 1 ? 8 : 6) : kind === "gold" ? 4 : 4;
    return fmtNum(v, dp);
  };

  // Compact/full label for large outputs. Returns secondary readable text
  // (e.g. "≈ 193,96 tỷ ₫") when number is huge, plus a full-precision string
  // for tooltip.
  const formatOutput = (v: number, kind: AssetKind, code: string) => {
    const full = fmtAmount(v, kind, code);
    let secondary: string | null = null;
    if (code === "vnd" && Math.abs(v) >= 1_000_000) {
      secondary = `≈ ${fmtVNDCompact(v)}`;
    } else if (kind !== "crypto" && Math.abs(v) >= 1_000_000_000) {
      secondary = `≈ ${fmtNum(v / 1_000_000_000, 2)} tỷ`;
    }
    return { full, secondary };
  };

  const codeLabel = (a: AssetOpt) => a.label.split(" — ")[0];
  const nameLabel = (a: AssetOpt) => {
    const parts = a.label.split(" — ");
    return parts[1] ?? parts[0];
  };

  const fromAsset = assets.find((x) => x.key === from) ?? null;
  const toAsset = assets.find((x) => x.key === to) ?? null;

  // "Giá chuẩn" — tỷ giá thực tế sẽ áp dụng khi quy đổi (bán FROM, mua TO)
  const appliedRate = useMemo(() => {
    if (!fromAsset || !toAsset) return null;
    if (toAsset.sellVnd <= 0) return null;
    return fromAsset.buyVnd / toAsset.sellVnd;
  }, [fromAsset, toAsset]);

  const rateDigits = (v: number) => (v >= 1000 ? 0 : v >= 1 ? 4 : 8);

  // Popular quick-pick pairs (from → to)
  const quickPairs: { from: string; to: string; label: string }[] = [
    { from: "f:USD", to: "vnd", label: "USD → VND" },
    { from: "f:EUR", to: "vnd", label: "EUR → VND" },
    { from: "f:JPY", to: "vnd", label: "JPY → VND" },
    { from: "f:CNY", to: "vnd", label: "CNY → VND" },
    { from: "f:KRW", to: "vnd", label: "KRW → VND" },
    { from: "c:bitcoin", to: "vnd", label: "BTC → VND" },
    { from: "c:ethereum", to: "vnd", label: "ETH → VND" },
  ].filter((p) => assets.some((a) => a.key === p.from) && assets.some((a) => a.key === p.to));

  const applyPair = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
  };

  return (
    <SectionCard
      id="converter"
      icon={<Wrench className="h-4 w-4" />}
      title="Công cụ chuyển đổi"
    >
      {/* Wise-style converter */}
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-2xl pb-6">
          {/* Quick-pick pairs */}
          {quickPairs.length > 0 && (
            <div className="mb-6">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Cặp phổ biến
              </div>
              <div className="flex flex-wrap gap-2">
                {quickPairs.map((p) => {
                  const active = from === p.from && to === p.to;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPair(p.from, p.to)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold tabular transition-colors",
                        active
                          ? "border-gold bg-gold text-gold-foreground"
                          : "border-border bg-background/60 text-foreground/80 hover:border-gold/40 hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Applied rate header — tỷ giá chuẩn áp dụng cho giao dịch */}
          <div className="text-center pb-6 mb-6 border-b border-border/60">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Tỷ giá quy đổi
            </div>
            <div className="text-xl sm:text-2xl font-semibold tabular text-foreground">
              {fromAsset && toAsset && appliedRate
                ? `1 ${codeLabel(fromAsset)} = ${fmtNum(appliedRate, rateDigits(appliedRate))} ${codeLabel(toAsset)}`
                : "—"}
            </div>
          </div>

          {/* FROM row */}
          <WiseRow
            label="Số tiền"
            assets={assets}
            value={from}
            onChange={setFrom}
            asset={fromAsset}
            codeLabel={codeLabel}
          >
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-label="Số tiền cần đổi"
              className="h-16 border-0 bg-transparent px-0 text-3xl sm:text-4xl tabular font-semibold tracking-tight text-foreground caret-gold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
            />
          </WiseRow>

          {/* Swap button overlapping */}
          <div className="relative h-5 my-2">
            <Button
              variant="outline"
              size="icon"
              onClick={swap}
              className={cn(
                "absolute left-6 -top-5 z-10 h-11 w-11 rounded-full bg-gold text-gold-foreground border-2 border-card hover:bg-gold/90 hover:text-gold-foreground shadow-md transition-transform duration-300",
                swapped && "rotate-180",
              )}
              aria-label="Đảo chiều"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* TO row */}
          <WiseRow
            label="Chuyển đổi thành"
            assets={assets}
            value={to}
            onChange={setTo}
            asset={toAsset}
            codeLabel={codeLabel}
          >
            {(() => {
              if (!result) {
                return (
                  <div className="h-16 flex items-center text-3xl sm:text-4xl tabular font-semibold tracking-tight text-foreground">
                    —
                  </div>
                );
              }
              const { full, secondary } = formatOutput(
                result.amountB_realistic,
                result.b.kind,
                result.b.key,
              );
              const long = full.length > 14;
              return (
                <div className="min-h-16 flex flex-col justify-center select-text">
                  <div
                    className={cn(
                      "tabular font-semibold tracking-tight text-foreground break-all leading-tight",
                      long ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl",
                    )}
                  >
                    {full}
                  </div>
                  {secondary && (
                    <div className="mt-1 text-sm sm:text-base text-muted-foreground tabular">
                      {secondary}
                    </div>
                  )}
                </div>
              );
            })()}
          </WiseRow>

        </div>
      </div>
    </SectionCard>
  );
}

/* ───────── Helper components ───────── */

function WiseRow({
  label,
  assets,
  value,
  onChange,
  asset,
  codeLabel,
  children,
}: {
  label: string;
  assets: AssetOpt[];
  value: string;
  onChange: (v: string) => void;
  asset: AssetOpt | null;
  codeLabel: (a: AssetOpt) => string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const kindLabel: Record<AssetKind, string> = {
    forex: "Ngoại tệ",
    crypto: "Tiền điện tử",
    gold: "Vàng",
  };
  const grouped = useMemo(() => {
    const g: Record<AssetKind, AssetOpt[]> = { forex: [], crypto: [], gold: [] };
    assets.forEach((a) => g[a.kind].push(a));
    return g;
  }, [assets]);

  return (
    <div className="rounded-2xl border border-border bg-card/60 hover:border-gold/40 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20 transition-colors px-5 sm:px-6 py-5 sm:py-6">
      <div className="text-sm font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">{children}</div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background/80 px-4 text-base font-semibold tracking-wide hover:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              <span className="tabular font-bold text-foreground text-base">
                {asset ? codeLabel(asset) : "—"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Tìm USD, EUR, BTC, vàng..." />
              <CommandList className="max-h-72">
                <CommandEmpty>Không tìm thấy.</CommandEmpty>
                {(["forex", "crypto", "gold"] as AssetKind[]).map((kind) =>
                  grouped[kind].length > 0 ? (
                    <CommandGroup key={kind} heading={kindLabel[kind]}>
                      {grouped[kind].map((a) => {
                        const code = codeLabel(a);
                        const name = a.label.split(" — ")[1] ?? "";
                        return (
                          <CommandItem
                            key={a.key}
                            value={`${code} ${name} ${a.label}`}
                            onSelect={() => {
                              onChange(a.key);
                              setOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <span className="tabular font-bold text-foreground w-14 shrink-0">{code}</span>
                            <span className="truncate text-muted-foreground">{name}</span>
                            {value === a.key && <Check className="ml-auto h-4 w-4 text-gold" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ) : null,
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}