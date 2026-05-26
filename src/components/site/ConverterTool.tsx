import { useMemo, useState } from "react";
import { ArrowRightLeft, Wrench, TrendingDown, TrendingUp } from "lucide-react";
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
  const crypto = useQuery({ queryKey: ["crypto"], queryFn: () => fetchCryptoPrices(), refetchInterval: 15000 });
  const forex = useQuery({ queryKey: ["forex"], queryFn: fetchForexRates, refetchInterval: 10 * 60 * 1000 });
  const gold = useQuery({ queryKey: ["gold"], queryFn: fetchGoldPrices, refetchInterval: 5000 });

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
      <div className="p-4 lg:p-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] items-end">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium uppercase">Từ</label>
          <div className="flex gap-2">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="text"
              inputMode="decimal"
              className="text-lg tabular font-semibold h-12"
            />
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="h-12 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {assets.length <= 1 && <SelectItem value="loading" disabled>Đang tải...</SelectItem>}
                {assets.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={swap}
          className={cn(
            "h-12 w-12 rounded-full mx-auto transition-transform duration-300 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/30",
            swapped && "rotate-180"
          )}
          aria-label="Đảo chiều Từ ↔ Sang"
        >
          <ArrowRightLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium uppercase">Sang</label>
          <div className="flex gap-2">
            <div className="flex-1 h-12 px-4 flex items-center rounded-md border border-input bg-muted/40 text-lg tabular font-bold text-gold overflow-hidden">
              {result ? fmtAmount(result.amountB_realistic, result.b.kind, result.b.key) : "—"}
            </div>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="h-12 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {assets.length <= 1 && <SelectItem value="loading" disabled>Đang tải...</SelectItem>}
                {assets.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {result && result.a.key !== result.b.key && (
        <div className="px-4 lg:px-6 pb-4 space-y-3">
          {/* Giá mua / giá bán rõ ràng */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-[11px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-blue-500" />
                Giá mua vào <span className="text-muted-foreground/60 font-normal">(bạn bán {codeLabel(result.a)})</span>
              </div>
              <div className="mt-1.5 tabular font-semibold text-lg">
                1 {codeLabel(result.a)} = {fmtVND(result.a.buyVnd)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Bán {fmtAmount(result.n, result.a.kind, result.a.key)} {codeLabel(result.a)} → nhận {fmtVND(result.vndFromSelling)}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-[11px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                Giá bán ra <span className="text-muted-foreground/60 font-normal">(bạn mua {codeLabel(result.b)})</span>
              </div>
              <div className="mt-1.5 tabular font-semibold text-lg">
                1 {codeLabel(result.b)} = {fmtVND(result.b.sellVnd)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Mua {fmtAmount(result.amountB_realistic, result.b.kind, result.b.key)} {codeLabel(result.b)} → trả {fmtVND(result.vndFromSelling)}
              </div>
            </div>
          </div>

          {/* Tổng kết so sánh */}
          <div className="rounded-xl border bg-primary/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-[11px] uppercase text-muted-foreground font-semibold">Thực nhận</div>
                <div className="mt-1 tabular font-bold text-xl text-gold">
                  {fmtAmount(result.amountB_realistic, result.b.kind, result.b.key)}{" "}
                  <span className="text-sm text-muted-foreground font-semibold">{codeLabel(result.b)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase text-muted-foreground font-semibold">So với giá giữa (mid)</div>
                <div className={cn(
                  "mt-1 tabular font-semibold flex items-center justify-end gap-1",
                  result.loss >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {result.loss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {result.loss >= 0 ? "+" : ""}{fmtAmount(result.loss, result.b.kind, result.b.key)}{" "}
                  <span className="text-xs">({result.lossPct >= 0 ? "+" : ""}{result.lossPct.toFixed(2)}%)</span>
                </div>
              </div>
            </div>

            {/* Thanh spread trực quan */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Giá giữa (mid): {fmtAmount(result.amountB_mid, result.b.kind, result.b.key)} {codeLabel(result.b)}</span>
                <span>Spread: {Math.abs(result.lossPct).toFixed(2)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-primary to-orange-500 rounded-full"
                  style={{ width: "100%" }}
                />
                <div
                  className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow"
                  style={{ left: `${Math.min(100, Math.max(0, 50 - (result.lossPct / 2)))}%`, transform: "translateX(-50%)" }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Bạn bán rẻ hơn</span>
                <span>Bạn mua đắt hơn</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-4 lg:px-6 pb-4 text-xs text-muted-foreground">
        Kết quả tính theo giá <strong>bán của bạn</strong> (thị trường mua vào) và <strong>mua của bạn</strong> (thị trường bán ra),
        phản ánh lãi/lỗ do chênh lệch mua–bán. Chỉ mang tính tham khảo, không bao gồm phí giao dịch.
      </div>
      <div className="px-4 lg:px-6 pb-6">
        <ConverterPairChart from={chartFrom} to={chartTo} />
      </div>
    </SectionCard>
  );
}