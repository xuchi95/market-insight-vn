import { useMemo, useState } from "react";
import { ArrowUpDown, Wrench, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
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

  // Hiển thị giá VND cho 1 đơn vị tài sản với 2 chữ số thập phân,
  // khớp định dạng cột Mua/Bán trên trang Tỷ giá ngoại tệ.
  const fmtRateVND = (v: number) => `${fmtNum(v, 2)} ₫`;

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

  return (
    <SectionCard
      id="converter"
      icon={<Wrench className="h-4 w-4" />}
      title="Công cụ chuyển đổi"
      description="Chọn cặp tiền, nhập số lượng — tính lãi/lỗ theo giá mua/bán thực tế"
    >
      {/* Editorial pair selector */}
      <div className="relative p-4 sm:p-6 lg:p-8">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch lg:gap-4">
          {/* FROM */}
          <PairPanel
            eyebrow="Bạn đổi"
            code={fromAsset ? codeLabel(fromAsset) : "—"}
            name={fromAsset ? nameLabel(fromAsset) : ""}
            assets={assets}
            value={from}
            onChange={setFrom}
          >
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="text"
              inputMode="decimal"
              aria-label="Số lượng"
              className="h-14 border-0 bg-transparent px-0 text-3xl sm:text-4xl tabular font-semibold tracking-tight text-foreground shadow-none focus-visible:ring-0 focus-visible:border-0"
            />
          </PairPanel>

          {/* SWAP */}
          <div className="flex items-center justify-center lg:px-1">
            <div className="relative w-full lg:w-auto">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent lg:hidden" aria-hidden />
              <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent hidden lg:block" aria-hidden />
              <Button
                variant="outline"
                size="icon"
                onClick={swap}
                className={cn(
                  "relative h-12 w-12 rounded-full mx-auto block bg-card border-gold/30 text-gold shadow-[0_0_0_4px_var(--card)] hover:bg-gold/10 hover:text-gold hover:border-gold/50 transition-transform duration-300",
                  swapped && "rotate-180",
                )}
                aria-label="Đảo chiều Từ ↔ Sang"
              >
                <ArrowUpDown className="h-4 w-4 lg:hidden" />
                <ArrowUpDown className="h-4 w-4 hidden lg:block rotate-90" />
              </Button>
            </div>
          </div>

          {/* TO */}
          <PairPanel
            eyebrow="Bạn nhận"
            code={toAsset ? codeLabel(toAsset) : "—"}
            name={toAsset ? nameLabel(toAsset) : ""}
            assets={assets}
            value={to}
            onChange={setTo}
            tone="gold"
          >
            <div className="h-14 flex items-baseline gap-2 overflow-hidden">
              <span className="font-serif text-3xl sm:text-4xl tabular font-normal tracking-tight text-gold leading-none truncate">
                {result ? fmtAmount(result.amountB_realistic, result.b.kind, result.b.key) : "—"}
              </span>
            </div>
          </PairPanel>
        </div>
      </div>
      {result && result.a.key !== result.b.key && (
        <>
          {/* Hairline divider */}
          <div className="mx-4 sm:mx-6 lg:mx-8 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" aria-hidden />

          <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-6 space-y-5">
            {/* Giá mua / giá bán — editorial split */}
            <div className="grid gap-3 sm:grid-cols-2">
              <RateTile
                tone="down"
                icon={<TrendingDown className="h-3.5 w-3.5" />}
                eyebrow="Giá mua vào"
                sub={`Bạn bán ${codeLabel(result.a)}`}
                price={`1 ${codeLabel(result.a)} = ${fmtRateVND(result.a.buyVnd)}`}
                detail={`Bán ${fmtAmount(result.n, result.a.kind, result.a.key)} ${codeLabel(result.a)} → nhận ${fmtVND(result.vndFromSelling)}`}
              />
              <RateTile
                tone="up"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                eyebrow="Giá bán ra"
                sub={`Bạn mua ${codeLabel(result.b)}`}
                price={`1 ${codeLabel(result.b)} = ${fmtRateVND(result.b.sellVnd)}`}
                detail={`Mua ${fmtAmount(result.amountB_realistic, result.b.kind, result.b.key)} ${codeLabel(result.b)} → trả ${fmtVND(result.vndFromSelling)}`}
              />
            </div>

            {/* Tổng kết — editorial result strip */}
            <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] via-card to-card">
              <div className="absolute inset-0 bg-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_60%)]" aria-hidden />
              <div className="relative p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="eyebrow flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Thực nhận</div>
                    <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                      <span className="font-serif text-2xl sm:text-3xl tabular text-gold leading-none">
                        {fmtAmount(result.amountB_realistic, result.b.kind, result.b.key)}
                      </span>
                      <span className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                        {codeLabel(result.b)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-auto">
                    <div className="eyebrow">So với mid</div>
                    <div className={cn(
                      "mt-1.5 tabular text-base sm:text-lg font-semibold flex items-center justify-end gap-1",
                      result.loss >= 0 ? "text-[color:var(--up)]" : "text-[color:var(--down)]",
                    )}>
                      {result.loss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {result.loss >= 0 ? "+" : ""}{fmtAmount(result.loss, result.b.kind, result.b.key)}
                      <span className="text-sm font-medium opacity-80">
                        ({result.lossPct >= 0 ? "+" : ""}{result.lossPct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thanh spread */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                    <span>Mid · {fmtAmount(result.amountB_mid, result.b.kind, result.b.key)} {codeLabel(result.b)}</span>
                    <span>Spread · {Math.abs(result.lossPct).toFixed(2)}%</span>
                  </div>
                  <div className="relative h-1.5 w-full rounded-full bg-muted overflow-visible">
                    <div
                      className="absolute inset-0 rounded-full opacity-90"
                      style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--down) 80%, transparent), color-mix(in oklab, var(--gold) 70%, transparent), color-mix(in oklab, var(--up) 80%, transparent))" }}
                    />
                    <div
                      className="absolute top-1/2 h-3.5 w-[2px] bg-foreground -translate-y-1/2"
                      style={{ left: `${Math.min(100, Math.max(0, 50 - (result.lossPct / 2)))}%` }}
                      aria-hidden
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground/80 mt-1.5">
                    <span>Bán rẻ hơn</span>
                    <span>Mua đắt hơn</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <p className="px-4 sm:px-6 lg:px-8 pb-5 text-sm leading-relaxed text-muted-foreground">
        Kết quả tính theo giá <span className="text-foreground/80">bán của bạn</span> (thị trường mua vào) và <span className="text-foreground/80">mua của bạn</span> (thị trường bán ra),
        phản ánh lãi/lỗ do chênh lệch mua–bán. Chỉ mang tính tham khảo, chưa gồm phí giao dịch.
      </p>
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        <ConverterPairChart from={chartFrom} to={chartTo} />
      </div>
    </SectionCard>
  );
}

/* ───────── Helper components ───────── */

function PairPanel({
  eyebrow,
  code,
  name,
  assets,
  value,
  onChange,
  children,
  tone,
}: {
  eyebrow: string;
  code: string;
  name: string;
  assets: AssetOpt[];
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  tone?: "gold";
}) {
  return (
    <div className={cn(
      "group relative rounded-2xl border bg-card/60 backdrop-blur-sm p-4 sm:p-5 transition-colors",
      tone === "gold"
        ? "border-gold/25 bg-gradient-to-br from-gold/[0.05] to-transparent"
        : "border-border hover:border-gold/25",
    )}>
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{eyebrow}</span>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            aria-label={eyebrow}
            className="h-9 w-auto max-w-[60%] gap-2 rounded-full border-border/80 bg-background/60 px-3 text-xs font-semibold tracking-wide hover:border-gold/40 focus:ring-0 focus:ring-offset-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {assets.length <= 1 && <SelectItem value="loading" disabled>Đang tải...</SelectItem>}
            {assets.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-3">
        {children}
      </div>
      <div className="mt-2 flex items-baseline gap-2 text-xs text-muted-foreground">
        <span className="font-mono font-semibold tracking-[0.12em] text-foreground/70">{code}</span>
        <span className="truncate">· {name}</span>
      </div>
    </div>
  );
}

function RateTile({
  tone,
  icon,
  eyebrow,
  sub,
  price,
  detail,
}: {
  tone: "up" | "down";
  icon: React.ReactNode;
  eyebrow: string;
  sub: string;
  price: string;
  detail: string;
}) {
  return (
    <div className="group relative rounded-xl border border-border/80 bg-muted/20 p-3.5 transition-colors hover:border-gold/25 hover:bg-muted/30">
      <div className="flex items-center gap-2">
        <span className={cn(
          "grid h-6 w-6 place-items-center rounded-md",
          tone === "down" ? "bg-[color:var(--down)]/12 text-[color:var(--down)]" : "bg-[color:var(--up)]/12 text-[color:var(--up)]",
        )}>{icon}</span>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.14em] font-semibold text-foreground/80">{eyebrow}</div>
          <div className="text-xs text-muted-foreground truncate">{sub}</div>
        </div>
      </div>
      <div className="mt-2.5 tabular font-semibold text-[15px] leading-tight">{price}</div>
      <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{detail}</div>
    </div>
  );
}