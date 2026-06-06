import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getVerifyOtpStats } from "@/lib/admin/verify-otp-stats.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_admin/mw-admin/verify-otp-stats")({
  component: VerifyOtpStatsPage,
});

const RANGES = [
  { label: "7 ngày", value: 7 },
  { label: "14 ngày", value: 14 },
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
] as const;

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function VerifyOtpStatsPage() {
  const fn = useServerFn(getVerifyOtpStats);
  const [days, setDays] = useState<number>(14);
  const [customInput, setCustomInput] = useState<string>("");
  const [customError, setCustomError] = useState<string | null>(null);

  const validateCustom = (
    raw: string,
  ): { ok: true; value: number } | { ok: false; error: string } => {
    const trimmed = raw.trim();
    if (trimmed === "") return { ok: false, error: "Nhập số ngày." };
    if (!/^\d+$/.test(trimmed)) return { ok: false, error: "Phải là số nguyên." };
    const n = Number(trimmed);
    if (n < 1 || n > 365) return { ok: false, error: "Ngoài khoảng 1–365." };
    return { ok: true, value: n };
  };

  const { data, isLoading, isFetching, isError, error, dataUpdatedAt, errorUpdatedAt } = useQuery({
    queryKey: ["admin", "verify-otp-stats", days],
    queryFn: () => fn({ data: { days } }),
  });

  // Toast on apply (when days change via "Áp dụng" or preset).
  const pendingToastDays = useRef<number | null>(null);
  const lastSuccessAt = useRef<number>(0);
  const lastErrorAt = useRef<number>(0);

  useEffect(() => {
    if (pendingToastDays.current === null) return;
    if (isFetching) return;
    if (!isError && dataUpdatedAt > lastSuccessAt.current) {
      lastSuccessAt.current = dataUpdatedAt;
      toast.success(`Đã cập nhật dữ liệu ${pendingToastDays.current} ngày`);
      pendingToastDays.current = null;
    } else if (isError && errorUpdatedAt > lastErrorAt.current) {
      lastErrorAt.current = errorUpdatedAt;
      const msg = error instanceof Error ? error.message : "Không xác định";
      toast.error("Cập nhật thất bại", { description: msg });
      pendingToastDays.current = null;
    }
  }, [isFetching, isError, error, dataUpdatedAt, errorUpdatedAt]);

  const maxDay = Math.max(1, ...(data?.byDay.map((d) => d.success + d.failed) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">
            Auth · Magic Link
          </div>
          <h1 className="font-display text-2xl">Tỷ lệ lỗi verifyOtp</h1>
          <p className="text-sm text-muted-foreground">
            Thống kê các lượt xác thực OTP (magic link, recovery, signup…) thành công và thất bại.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-md border border-border p-1">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={days === r.value ? "default" : "ghost"}
                onClick={() => {
                  setDays(r.value);
                  setCustomInput("");
                  setCustomError(null);
                }}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              const result = validateCustom(customInput);
              if (!result.ok) {
                setCustomError(result.error);
                return;
              }
              setCustomError(null);
              setDays(result.value);
            }}
            noValidate
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  placeholder="Tùy ý"
                  value={customInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCustomInput(next);
                    // Re-validate live so error clears the moment input is valid.
                    if (next.trim() === "") {
                      setCustomError(null);
                      return;
                    }
                    const result = validateCustom(next);
                    setCustomError(result.ok ? null : result.error);
                  }}
                  aria-invalid={customError ? true : undefined}
                  aria-describedby={customError ? "custom-days-error" : undefined}
                  className={`h-9 w-24 ${customError ? "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/40" : ""}`}
                />
                {customError ? (
                  <span
                    id="custom-days-error"
                    role="alert"
                    className="mt-1 flex items-center gap-1 text-[11px] leading-tight text-rose-500"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                    <span>{customError}</span>
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">ngày (1–365)</span>
              <Button type="submit" size="sm" variant="outline" disabled={!!customError}>
                Áp dụng
              </Button>
            </div>
          </form>
          <span className="text-xs text-muted-foreground">Đang xem: {days} ngày</span>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard label="Tổng lượt" value={data.totals.total} />
            <SummaryCard
              label="Thành công"
              value={data.totals.success}
              tone="up"
            />
            <SummaryCard label="Thất bại" value={data.totals.failed} tone="down" />
            <SummaryCard
              label="Tỷ lệ lỗi"
              value={pct(data.totals.failRate)}
              tone={data.totals.failRate > 0.1 ? "down" : "default"}
            />
          </div>

          {/* By day chart */}
          <section className="rounded-lg border border-border bg-card/40 p-4">
            <h2 className="mb-3 font-medium">Theo ngày</h2>
            {data.byDay.length === 0 ? (
              <div className="text-sm text-muted-foreground">Chưa có dữ liệu.</div>
            ) : (
              <div className="space-y-2">
                {data.byDay.map((d) => {
                  const total = d.success + d.failed;
                  const sPct = (d.success / maxDay) * 100;
                  const fPct = (d.failed / maxDay) * 100;
                  const failRate = total > 0 ? d.failed / total : 0;
                  return (
                    <div key={d.date} className="flex items-center gap-3 text-xs">
                      <div className="w-20 shrink-0 font-mono text-muted-foreground">
                        {d.date}
                      </div>
                      <div className="flex h-5 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full bg-emerald-500/70"
                          style={{ width: `${sPct}%` }}
                          title={`Thành công: ${d.success}`}
                        />
                        <div
                          className="h-full bg-rose-500/70"
                          style={{ width: `${fPct}%` }}
                          title={`Thất bại: ${d.failed}`}
                        />
                      </div>
                      <div className="w-32 shrink-0 text-right tabular-nums text-muted-foreground">
                        {d.success} / {d.failed}{" "}
                        <span className={failRate > 0.1 ? "text-rose-500" : ""}>
                          ({pct(failRate)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* By type */}
          <section className="rounded-lg border border-border bg-card/40 p-4">
            <h2 className="mb-3 font-medium">Theo loại OTP</h2>
            {data.byType.length === 0 ? (
              <div className="text-sm text-muted-foreground">Chưa có dữ liệu.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Thành công</TableHead>
                    <TableHead className="text-right">Thất bại</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                    <TableHead className="text-right">Tỷ lệ lỗi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byType.map((t) => {
                    const total = t.success + t.failed;
                    const rate = total > 0 ? t.failed / total : 0;
                    return (
                      <TableRow key={t.otp_type}>
                        <TableCell className="font-mono">{t.otp_type}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-500">
                          {t.success}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-rose-500">
                          {t.failed}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{total}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${
                            rate > 0.1 ? "text-rose-500" : "text-muted-foreground"
                          }`}
                        >
                          {pct(rate)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>

          {/* Top errors */}
          <section className="rounded-lg border border-border bg-card/40 p-4">
            <h2 className="mb-3 font-medium">Lỗi thường gặp</h2>
            {data.topErrors.length === 0 ? (
              <div className="text-sm text-muted-foreground">Không có lỗi nào trong khoảng này.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thông báo lỗi</TableHead>
                    <TableHead className="text-right">Số lần</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topErrors.map((e) => (
                    <TableRow key={e.error_message}>
                      <TableCell className="font-mono text-xs">{e.error_message}</TableCell>
                      <TableCell className="text-right tabular-nums">{e.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "up" | "down";
}) {
  const toneClass =
    tone === "up"
      ? "text-emerald-500"
      : tone === "down"
        ? "text-rose-500"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl ${toneClass}`}>{value}</div>
    </div>
  );
}