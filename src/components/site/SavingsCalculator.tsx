import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/site/SectionCard";
import { TENORS, type SavingsRate } from "@/lib/data/savingsRates";
import { cn } from "@/lib/utils";

type TenorKey = keyof SavingsRate["rates"];
type Period = "month" | "quarter" | "year";
type Mode = "simple" | "compound";

const TENOR_MONTHS: Record<TenorKey, number> = {
  m1: 1, m3: 3, m6: 6, m9: 9, m12: 12, m13: 13, m18: 18, m24: 24, m36: 36,
};

const PERIOD_LABEL: Record<Period, string> = {
  month: "Tháng",
  quarter: "Quý",
  year: "Năm",
};

function fmtVnd(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₫";
}

function parseAmount(s: string): number {
  const n = Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  items: SavingsRate[];
}

export function SavingsCalculator({ items }: Props) {
  const [amountStr, setAmountStr] = useState("100000000");
  const [bankShort, setBankShort] = useState<string>("");
  const [tenor, setTenor] = useState<TenorKey>("m12");
  const [customRateStr, setCustomRateStr] = useState<string>("");
  const [period, setPeriod] = useState<Period>("year");
  const [periodCount, setPeriodCount] = useState<string>("1");
  const [mode, setMode] = useState<Mode>("compound");

  const amount = parseAmount(amountStr);
  const periods = Math.max(0, Number(periodCount) || 0);
  const totalMonths = period === "month" ? periods : period === "quarter" ? periods * 3 : periods * 12;

  const selectedBank = items.find((b) => b.shortName === bankShort);
  const bankRate = selectedBank?.rates[tenor];
  const customRate = Number(customRateStr.replace(",", "."));
  const annualRate = Number.isFinite(customRate) && customRate > 0 ? customRate : bankRate ?? 0;
  const tenorMonths = TENOR_MONTHS[tenor];

  const result = useMemo(() => {
    if (amount <= 0 || annualRate <= 0 || totalMonths <= 0) {
      return { interest: 0, total: amount, cycles: 0, leftover: 0 };
    }
    const r = annualRate / 100;
    if (mode === "simple") {
      const interest = amount * r * (totalMonths / 12);
      return { interest, total: amount + interest, cycles: 1, leftover: 0 };
    }
    // Compound: tái tục theo kỳ hạn đã chọn, lãi nhập gốc mỗi kỳ.
    const cycles = Math.floor(totalMonths / tenorMonths);
    const leftover = totalMonths - cycles * tenorMonths;
    const perCycle = 1 + r * (tenorMonths / 12);
    let principal = amount * Math.pow(perCycle, cycles);
    if (leftover > 0) principal = principal * (1 + r * (leftover / 12));
    return { interest: principal - amount, total: principal, cycles, leftover };
  }, [amount, annualRate, totalMonths, tenorMonths, mode]);

  // Bảng so sánh top kỳ hạn đã chọn
  const compareRows = useMemo(() => {
    if (amount <= 0 || totalMonths <= 0) return [];
    return items
      .map((b) => {
        const rate = b.rates[tenor];
        if (typeof rate !== "number") return null;
        const r = rate / 100;
        let total: number;
        if (mode === "simple") {
          total = amount + amount * r * (totalMonths / 12);
        } else {
          const cycles = Math.floor(totalMonths / tenorMonths);
          const leftover = totalMonths - cycles * tenorMonths;
          const perCycle = 1 + r * (tenorMonths / 12);
          let p = amount * Math.pow(perCycle, cycles);
          if (leftover > 0) p = p * (1 + r * (leftover / 12));
          total = p;
        }
        return { bank: b.bank, shortName: b.shortName, rate, interest: total - amount, total };
      })
      .filter((x): x is { bank: string; shortName: string; rate: number; interest: number; total: number } => x !== null)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [items, tenor, amount, totalMonths, tenorMonths, mode]);

  return (
    <SectionCard
      title="Công cụ tính lãi tiết kiệm"
      description="Ước tính số tiền lãi và tổng nhận về theo lãi suất các ngân hàng — gửi tháng, quý, năm hoặc nhiều năm."
      icon={<Calculator className="h-4 w-4" />}
    >
      <div className="grid gap-6 p-4 lg:p-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Form nhập */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Số tiền gửi (VND)</Label>
            <Input
              id="amount"
              inputMode="numeric"
              value={amount > 0 ? new Intl.NumberFormat("vi-VN").format(amount) : ""}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="VD: 100.000.000"
            />
            <p className="text-xs text-muted-foreground">{fmtVnd(amount)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank">Ngân hàng</Label>
              <select
                id="bank"
                value={bankShort}
                onChange={(e) => setBankShort(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Tự nhập lãi suất —</option>
                {items.map((b) => (
                  <option key={b.shortName} value={b.shortName}>{b.bank}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenor">Kỳ hạn</Label>
              <select
                id="tenor"
                value={tenor}
                onChange={(e) => setTenor(e.target.value as TenorKey)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TENORS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rate">Lãi suất (%/năm)</Label>
              <Input
                id="rate"
                inputMode="decimal"
                value={customRateStr}
                onChange={(e) => setCustomRateStr(e.target.value)}
                placeholder={bankRate ? bankRate.toFixed(2) : "VD: 5.5"}
              />
              <p className="text-xs text-muted-foreground">
                {selectedBank && bankRate ? (
                  <>Đang dùng: <strong className="text-foreground">{annualRate.toFixed(2)}%</strong> ({selectedBank.bank})</>
                ) : (
                  <>Đang dùng: <strong className="text-foreground">{annualRate ? annualRate.toFixed(2) + "%" : "—"}</strong></>
                )}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Hình thức</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-input p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("simple")}
                  className={cn("rounded px-2 py-1.5", mode === "simple" ? "bg-[var(--gold)]/20 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground")}
                >Không tái tục</button>
                <button
                  type="button"
                  onClick={() => setMode("compound")}
                  className={cn("rounded px-2 py-1.5", mode === "compound" ? "bg-[var(--gold)]/20 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground")}
                >Tái tục (gốc + lãi)</button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Thời gian gửi</Label>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={periodCount}
                onChange={(e) => setPeriodCount(e.target.value.replace(/[^\d]/g, ""))}
                className="w-24"
              />
              <div className="grid flex-1 grid-cols-3 gap-1 rounded-md border border-input p-1 text-xs">
                {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn("rounded px-2 py-1.5", period === p ? "bg-[var(--gold)]/20 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground")}
                  >
                    {PERIOD_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tương đương <strong className="text-foreground">{totalMonths}</strong> tháng
              {mode === "compound" && result.cycles > 0 && (
                <> · {result.cycles} kỳ × {tenorMonths} tháng{result.leftover > 0 && <> + {result.leftover} tháng lẻ</>}</>
              )}
            </p>
          </div>
        </div>

        {/* Kết quả */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-gradient-to-br from-[var(--gold)]/10 via-transparent to-transparent p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Tiền lãi ước tính</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-[var(--gold)]">{fmtVnd(result.interest)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Tổng nhận về</div>
                <div className="font-semibold tabular-nums">{fmtVnd(result.total)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Trung bình / tháng</div>
                <div className="font-semibold tabular-nums">{fmtVnd(totalMonths > 0 ? result.interest / totalMonths : 0)}</div>
              </div>
            </div>
          </div>

          {compareRows.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Top 8 ngân hàng — kỳ hạn {TENORS.find((t) => t.key === tenor)?.label}, {totalMonths} tháng
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">Ngân hàng</th>
                      <th className="px-3 py-2 text-right font-medium">%/năm</th>
                      <th className="px-3 py-2 text-right font-medium">Lãi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((r, idx) => (
                      <tr key={r.shortName} className="border-b border-border/40 hover:bg-accent/40">
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.bank}</div>
                        </td>
                        <td className={cn("px-3 py-2 text-right tabular-nums", idx === 0 && "text-[var(--gold)] font-bold")}>{r.rate.toFixed(2)}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums", idx === 0 && "text-[var(--gold)] font-bold")}>{fmtVnd(r.interest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            * Công thức: <em>Không tái tục</em> = Gốc × lãi suất × (số tháng / 12). <em>Tái tục</em> = lãi nhập gốc sau mỗi kỳ hạn. Kết quả mang tính tham khảo, chưa bao gồm thuế/phí và các ưu đãi riêng của ngân hàng.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}