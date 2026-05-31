import { useMemo, useState } from "react";
import { ArrowUpDown, Wrench, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "./SectionCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fmtVND, fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConverterPairChart, type PairChartAsset } from "./ConverterPairChart";

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
  const crypto = useQuery({ queryKey: ["crypto"], queryFn: () => fetchCryptoPrices(), refetchInterval: 60_000 });
  const forex = useQuery({ queryKey: ["forex"], queryFn: fetchForexRates, refetchInterval: 10 * 60 * 1000 });
  const gold = useQuery({ queryKey: ["gold"], queryFn: fetchGoldPrices, refetchInterval: 60_000 });

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
    // Bán A (giá thị trường mua vào) → ra VND, rồi mua B (giá thị trường bán ra)
    const vndFromSelling = a.buyVnd * n;
    const amountB_realistic = vndFromSelling / b.sellVnd;
    // So sánh lý tưởng (mid/mid)
    const amountB_mid = (a.rateVnd * n) / b.rateVnd;
    const loss = amountB_realistic - amountB_mid; // âm = lỗ do spread
    const lossPct = amountB_mid > 0 ? (loss / amountB_mid) * 100 : 0;
    // VND tương đương theo mid (để hiển thị nếu đích là VND)
    const vndMid = a.rateVnd * n;
    return { a, b, n, amountB_realistic, amountB_mid, loss, lossPct, vndFromSelling, vndMid };
  }, [assets, from, to, amount]);

  const fmtAmount = (v: number, kind: AssetKind, code: string) => {
    if (code === "vnd") return fmtVND(v);
    const dp = kind === "crypto" ? (v < 1 ? 8 : 6) : kind === "gold" ? 4 : 4;
    return fmtNum(v, dp);
  };

  const codeLabel = (a: AssetOpt) => a.label.split(" — ")[0];
  const nameLabel = (a: AssetOpt) => {
    const parts = a.label.split(" — ");
    return parts[1] ?? parts[0];
  };

  const fromAsset = assets.find((x) => x.key === from) ?? null;
  const toAsset = assets.find((x) => x.key === to) ?? null;
  const chartFrom: PairChartAsset | null = fromAsset
    ? { key: fromAsset.key, kind: fromAsset.kind, rateVnd: fromAsset.rateVnd, code: codeLabel(fromAsset) }
    : null;
  const chartTo: PairChartAsset | null = toAsset
    ? { key: toAsset.key, kind: toAsset.kind, rateVnd: toAsset.rateVnd, code: codeLabel(toAsset) }
    : null;

  const midRate = useMemo(() => {
    if (!fromAsset || !toAsset) return null;
    return fromAsset.rateVnd / toAsset.rateVnd;
  }, [fromAsset, toAsset]);

  const rateDigits = (v: number) => (v >= 1000 ? 0 : v >= 1 ? 4 : 8);

  return (
    <SectionCard
      id="converter"
      icon={<Wrench className="h-4 w-4" />}
      title="Công cụ chuyển đổi"
      description="Chọn cặp tiền, nhập số lượng — tính lãi/lỗ theo giá mua/bán thực tế"
    >
      {/* Wise-style converter */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-xl">
          {/* Mid-market rate header */}
          <div className="text-center pb-5 mb-5 border-b border-border/60">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">
              Tỷ giá quy đổi giữa (mid)
            </div>
            <div className="text-base sm:text-lg font-semibold tabular text-foreground">
              {fromAsset && toAsset && midRate
                ? `1 ${codeLabel(fromAsset)} = ${fmtNum(midRate, rateDigits(midRate))} ${codeLabel(toAsset)}`
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
              className="h-14 border-0 bg-transparent px-0 text-2xl sm:text-3xl tabular font-semibold tracking-tight text-foreground caret-gold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
            />
          </WiseRow>

          {/* Swap button overlapping */}
          <div className="relative h-3 my-1">
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
            <div className="h-14 flex items-center text-2xl sm:text-3xl tabular font-semibold tracking-tight text-foreground truncate">
              {result ? fmtAmount(result.amountB_realistic, result.b.kind, result.b.key) : "—"}
            </div>
          </WiseRow>

          {/* Realistic vs mid note */}
          {result && result.lossPct !== 0 && (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <span className="text-foreground/80">Lý tưởng theo giá mid: </span>
              <span className="tabular font-semibold text-foreground">
                {fmtAmount(result.amountB_mid, result.b.kind, result.b.key)}
              </span>
              <span className="mx-2 text-border">·</span>
              <span className={cn("tabular font-semibold", result.loss < 0 ? "text-down" : "text-up")}>
                {result.loss < 0 ? "−" : "+"}{Math.abs(result.lossPct).toFixed(2)}% do spread mua/bán
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-8 pb-6 pt-2">
        <ConverterPairChart from={chartFrom} to={chartTo} />
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
  return (
    <div className="rounded-2xl border border-border bg-card/60 hover:border-gold/40 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20 transition-colors px-4 sm:px-5 py-3">
      <div className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">{children}</div>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            aria-label={label}
            className="h-11 w-auto shrink-0 gap-1.5 rounded-full border-border bg-background/80 px-3 text-sm font-semibold tracking-wide hover:border-gold/40 focus:ring-0 focus:ring-offset-0 [&>svg]:hidden"
          >
            <span className="tabular font-bold text-foreground">
              {asset ? codeLabel(asset) : "—"}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {assets.length <= 1 && <SelectItem value="loading" disabled>Đang tải...</SelectItem>}
            {assets.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}