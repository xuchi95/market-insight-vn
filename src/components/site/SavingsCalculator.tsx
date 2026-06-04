import { useEffect, useMemo, useState } from "react";
import { Calculator, Wallet, Landmark, CalendarRange, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function getEffectiveRate(bank: SavingsRate | undefined, requestedTenor: TenorKey) {
  if (!bank) return null;
  const directRate = bank.rates[requestedTenor];
  if (typeof directRate === "number") {
    return { key: requestedTenor, rate: directRate, isFallback: false };
  }

  const available = (Object.keys(TENOR_MONTHS) as TenorKey[]).filter(
    (key) => typeof bank.rates[key] === "number",
  );
  if (available.length === 0) return null;

  const requestedMonths = TENOR_MONTHS[requestedTenor];
  const nearest = available.reduce((best, key) => {
    const distance = Math.abs(TENOR_MONTHS[key] - requestedMonths);
    const bestDistance = Math.abs(TENOR_MONTHS[best] - requestedMonths);
    if (distance !== bestDistance) return distance < bestDistance ? key : best;
    return TENOR_MONTHS[key] > TENOR_MONTHS[best] ? key : best;
  }, available[0]);

  return { key: nearest, rate: bank.rates[nearest] as number, isFallback: true };
}

interface Props {
  items: SavingsRate[];
}

function FieldHead({
  icon,
  title,
  hint,
  htmlFor,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        <span className="text-[var(--gold)]/80">{icon}</span>
        {title}
      </Label>
      {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

export function SavingsCalculator({ items }: Props) {
  const [amountStr, setAmountStr] = useState("100000000");
  const [bankShort, setBankShort] = useState<string>(items[0]?.shortName ?? "");
  const [tenor, setTenor] = useState<TenorKey>("m12");
  const [customRateStr, setCustomRateStr] = useState<string>("");
  const [period, setPeriod] = useState<Period>("year");
  const [periodCount, setPeriodCount] = useState<string>("1");
  const [mode, setMode] = useState<Mode>("compound");

  useEffect(() => {
    if (items.length === 0) return;
    if (!items.some((b) => b.shortName === bankShort)) {
      setBankShort(items[0].shortName);
      setCustomRateStr("");
    }
  }, [items, bankShort]);

  const amount = parseAmount(amountStr);
  const periods = Math.max(0, Number(periodCount) || 0);
  const totalMonths = period === "month" ? periods : period === "quarter" ? periods * 3 : periods * 12;

  const selectedBank = items.find((b) => b.shortName === bankShort);
  const effectiveRate = useMemo(() => getEffectiveRate(selectedBank, tenor), [selectedBank, tenor]);

  const customRate = Number(customRateStr.replace(",", "."));
  const hasCustom = customRateStr.trim() !== "" && Number.isFinite(customRate) && customRate > 0;
  const bankRate = effectiveRate?.rate;
  const annualRate = hasCustom ? customRate : bankRate ?? 0;
  // Kỳ hạn dùng để tính lãi: ưu tiên kỳ hạn người dùng chọn; nếu ngân hàng không có,
  // dùng kỳ hạn fallback để công thức tái tục không sai (tránh chia cho 0 hoặc lãi 0).
  const tenorMonths = hasCustom || !effectiveRate?.isFallback
    ? TENOR_MONTHS[tenor]
    : TENOR_MONTHS[effectiveRate.key];

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
        const rowRate = getEffectiveRate(b, tenor);
        if (!rowRate) return null;
        const rate = rowRate.rate;
        const rowTenorMonths = rowRate.isFallback ? TENOR_MONTHS[rowRate.key] : TENOR_MONTHS[tenor];
        const r = rate / 100;
        let total: number;
        if (mode === "simple") {
          total = amount + amount * r * (totalMonths / 12);
        } else {
          const cycles = Math.floor(totalMonths / rowTenorMonths);
          const leftover = totalMonths - cycles * rowTenorMonths;
          const perCycle = 1 + r * (rowTenorMonths / 12);
          let p = amount * Math.pow(perCycle, cycles);
          if (leftover > 0) p = p * (1 + r * (leftover / 12));
          total = p;
        }
        return { bank: b.bank, shortName: b.shortName, rate, interest: total - amount, total, appliedTenor: rowRate.key };
      })
      .filter((x): x is { bank: string; shortName: string; rate: number; interest: number; total: number; appliedTenor: TenorKey } => x !== null)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [items, tenor, amount, totalMonths, mode]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/[0.08] via-background to-background shadow-[0_0_60px_-15px_color-mix(in_oklab,var(--gold)_40%,transparent)]">
      {/* Ambient gold glows */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[var(--gold)]/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[var(--gold)]/[0.07] blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-[var(--gold)]/20 bg-gradient-to-r from-[var(--gold)]/10 to-transparent px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
          <Calculator className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight md:text-lg">Công cụ tính lãi tiết kiệm</h3>
            <span className="hidden items-center gap-1 rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--gold)] md:inline-flex">
              Lãi suất thật
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ước tính tiền lãi theo {items.length} ngân hàng — chọn ngân hàng, kỳ hạn và số tiền gửi.
          </p>
        </div>
      </div>

      <div className="relative grid gap-6 p-4 lg:p-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Form nhập — bố cục field chuyên nghiệp */}
        <div className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-4 lg:p-5">
          {/* Số tiền gửi */}
          <div>
            <FieldHead
              htmlFor="amount"
              icon={<Wallet className="h-3.5 w-3.5" />}
              title="Số tiền gửi"
              hint="VND"
            />
            <div className="relative">
              <Input
                id="amount"
                inputMode="numeric"
                value={amount > 0 ? new Intl.NumberFormat("vi-VN").format(amount) : ""}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="VD: 100.000.000"
                className="h-11 pr-14 text-base font-semibold tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
                VND
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[10_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmountStr(String(v))}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs tabular-nums transition-colors",
                    amount === v
                      ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-[var(--gold)]/40 hover:text-foreground",
                  )}
                >
                  {v >= 1_000_000_000 ? `${v / 1_000_000_000} tỷ` : `${v / 1_000_000} triệu`}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldHead htmlFor="bank" icon={<Landmark className="h-3.5 w-3.5" />} title="Ngân hàng" />
                <Select
                  value={bankShort}
                  onValueChange={(v) => { setBankShort(v); setCustomRateStr(""); }}
                >
                  <SelectTrigger id="bank" className="h-11">
                    <SelectValue placeholder="Chọn ngân hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((b) => (
                      <SelectItem key={b.shortName} value={b.shortName}>{b.bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldHead
                  htmlFor="tenor"
                  icon={<CalendarRange className="h-3.5 w-3.5" />}
                  title="Kỳ hạn"
                  hint={selectedBank && typeof selectedBank.rates[tenor] === "number" ? `${selectedBank.rates[tenor]!.toFixed(2)}%` : undefined}
                />
                <Select value={tenor} onValueChange={(v) => setTenor(v as TenorKey)}>
                  <SelectTrigger id="tenor" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TENORS.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                        {selectedBank && typeof selectedBank.rates[t.key] === "number"
                          ? ` · ${selectedBank.rates[t.key]!.toFixed(2)}%`
                          : " · gần nhất"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-3 py-2">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lãi suất áp dụng
                </span>
                {effectiveRate?.isFallback && !hasCustom && (
                  <span className="text-[10px] text-amber-400">
                    dùng kỳ hạn {TENORS.find((t) => t.key === effectiveRate.key)?.label}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <Input
                  id="rate"
                  inputMode="decimal"
                  value={customRateStr}
                  onChange={(e) => setCustomRateStr(e.target.value)}
                  placeholder={bankRate ? bankRate.toFixed(2) : "—"}
                  className="h-8 w-20 border-0 bg-transparent p-0 text-right text-xl font-bold tabular-nums text-[var(--gold)] shadow-none focus-visible:ring-0"
                />
                <span className="text-xs font-semibold text-[var(--gold)]">%/năm</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-2">
            <div>
              <FieldHead icon={<CalendarRange className="h-3.5 w-3.5" />} title="Thời gian gửi" />
              <div className="flex gap-1.5">
                <Input
                  inputMode="numeric"
                  value={periodCount}
                  onChange={(e) => setPeriodCount(e.target.value.replace(/[^\d]/g, ""))}
                  className="h-11 w-16 text-center text-base font-semibold tabular-nums"
                />
                <div className="grid flex-1 grid-cols-3 gap-1 rounded-md border border-input p-1">
                  {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={cn(
                        "rounded text-sm transition-colors",
                        period === p
                          ? "bg-[var(--gold)]/20 font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {PERIOD_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <FieldHead icon={<Repeat className="h-3.5 w-3.5" />} title="Hình thức gửi" />
              <div className="grid h-11 grid-cols-2 gap-1 rounded-md border border-input p-1">
                <button
                  type="button"
                  onClick={() => setMode("simple")}
                  className={cn(
                    "rounded text-sm transition-colors",
                    mode === "simple"
                      ? "bg-[var(--gold)]/20 font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Cuối kỳ
                </button>
                <button
                  type="button"
                  onClick={() => setMode("compound")}
                  className={cn(
                    "rounded text-sm transition-colors",
                    mode === "compound"
                      ? "bg-[var(--gold)]/20 font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Tái tục
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Kết quả */}
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/15 via-[var(--gold)]/[0.04] to-transparent p-5 shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--gold)_35%,transparent)]">
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[var(--gold)]/15 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Tiền lãi ước tính</div>
              <div className="text-xs text-muted-foreground tabular-nums">{totalMonths} tháng · {annualRate ? annualRate.toFixed(2) : "—"}%/năm</div>
            </div>
            <div className="relative mt-1 text-4xl font-extrabold tabular-nums text-[var(--gold)] drop-shadow-[0_0_20px_color-mix(in_oklab,var(--gold)_40%,transparent)]">{fmtVnd(result.interest)}</div>
            {annualRate === 0 && (
              <div className="relative mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Ngân hàng này chưa công bố lãi suất nào. Vui lòng nhập lãi suất tùy chỉnh ở mục bên trên.
              </div>
            )}
            <div className="relative mt-4 flex items-baseline justify-between border-t border-[var(--gold)]/15 pt-3 text-sm">
              <span className="text-xs text-muted-foreground">Tổng nhận về</span>
              <span className="font-semibold tabular-nums">{fmtVnd(result.total)}</span>
            </div>
          </div>

          {compareRows.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  So sánh top 8 ngân hàng · {TENORS.find((t) => t.key === tenor)?.label}
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
                      <tr
                        key={r.shortName}
                        onClick={() => { setBankShort(r.shortName); setCustomRateStr(""); }}
                        className={cn("border-b border-border/40 cursor-pointer hover:bg-accent/40", r.shortName === bankShort && "bg-[var(--gold)]/5")}
                      >
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
        </div>
      </div>
    </div>
  );
}