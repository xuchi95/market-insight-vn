import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { Sparkles, RefreshCw, AlertTriangle, DollarSign, Activity, Calendar } from "lucide-react";
import { getAiUsage, type AiUsageRollup, type AiUsageRecent } from "@/lib/admin/ai-usage.functions";

export const Route = createFileRoute("/_admin/mw-admin/ai-usage")({
  component: AiUsagePage,
});

function fmtUsd(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { hour12: false });
}

function pctDelta(curr: number, prev: number): { value: number; label: string; tone: "up" | "down" | "default" } {
  if (prev === 0 && curr === 0) return { value: 0, label: "—", tone: "default" };
  if (prev === 0) return { value: 100, label: "mới", tone: "up" };
  const delta = ((curr - prev) / prev) * 100;
  return {
    value: delta,
    label: `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs tuần trước`,
    tone: delta > 5 ? "up" : delta < -5 ? "down" : "default",
  };
}

function AiUsagePage() {
  const fetchUsage = useServerFn(getAiUsage);
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["admin", "ai-usage"],
    queryFn: () => fetchUsage(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const w = data?.windows;
  const deltaCost = useMemo(
    () => (w ? pctDelta(w.last7d.cost, w.prev7d.cost) : null),
    [w],
  );
  const deltaCalls = useMemo(
    () => (w ? pctDelta(w.last7d.calls, w.prev7d.calls) : null),
    [w],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--gold)]">
            Cloud & AI
          </div>
          <h1 className="font-display text-2xl">Chi phí AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi mỗi lần gọi Lovable AI Gateway từ các job để tối ưu chi phí. Số liệu chi phí là <em>ước tính</em>,
            dùng so sánh tương đối — không phải hoá đơn chính thức.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Tải lại
        </button>
      </header>

      {/* Window stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Chi phí 7 ngày"
          value={w ? fmtUsd(w.last7d.cost) : "—"}
          sub={deltaCost?.label}
          tone={deltaCost?.tone}
          icon={DollarSign}
        />
        <Stat
          label="Số lần gọi 7 ngày"
          value={w ? w.last7d.calls.toLocaleString("vi-VN") : "—"}
          sub={deltaCalls?.label}
          tone={deltaCalls?.tone}
          icon={Activity}
        />
        <Stat
          label="Hôm nay"
          value={w ? `${w.today.calls} lần · ${fmtUsd(w.today.cost)}` : "—"}
          icon={Calendar}
        />
        <Stat
          label="Lỗi 7 ngày"
          value={w ? w.last7d.errors.toLocaleString("vi-VN") : "—"}
          icon={AlertTriangle}
          tone={w && w.last7d.errors > 0 ? "down" : "default"}
        />
      </div>

      {error && (
        <div className="rounded-md border border-[var(--down)]/40 bg-[var(--down)]/5 p-3 text-sm text-[var(--down)]">
          Lỗi tải dữ liệu: {(error as Error).message}
        </div>
      )}

      {/* Per source × model rollup */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base">Breakdown theo job × model (30 ngày)</h2>
          <p className="text-xs text-muted-foreground">
            Sắp xếp theo chi phí ước tính. Job nào ở top = ứng cử viên giảm tiếp theo (chuyển model, giảm tần suất, hoặc dedup).
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nguồn</th>
                <th className="px-4 py-2 text-left">Model</th>
                <th className="px-4 py-2 text-right">Số lần</th>
                <th className="px-4 py-2 text-right">Lỗi</th>
                <th className="px-4 py-2 text-right">Tokens</th>
                <th className="px-4 py-2 text-right">Chi phí USD</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!isLoading && (data?.bySourceModel.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Chưa có lần gọi AI nào trong 30 ngày qua.</td></tr>
              )}
              {data?.bySourceModel.map((r) => <RollupRow key={`${r.source}|${r.model}`} r={r} />)}
            </tbody>
          </table>
        </div>
      </section>

      {/* Daily timeline */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base">Theo ngày (30 ngày gần nhất)</h2>
          <p className="text-xs text-muted-foreground">
            Mỗi cột = 1 ngày. Chiều cao = chi phí ước tính. Vạch đỏ = ngày có lỗi.
          </p>
        </header>
        <div className="p-4">
          <DailyChart data={data?.daily ?? []} />
        </div>
      </section>

      {/* Recent calls */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base">50 lần gọi gần nhất</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Thời điểm</th>
                <th className="px-4 py-2 text-left">Nguồn</th>
                <th className="px-4 py-2 text-left">Model</th>
                <th className="px-4 py-2 text-right">Prompt</th>
                <th className="px-4 py-2 text-right">Completion</th>
                <th className="px-4 py-2 text-right">USD</th>
                <th className="px-4 py-2 text-right">ms</th>
                <th className="px-4 py-2 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent ?? []).map((r) => <RecentRow key={r.id} r={r} />)}
              {!isLoading && (data?.recent.length ?? 0) === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Chưa có lần gọi AI nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Bảng giá ước tính trong <code className="rounded bg-muted/40 px-1">src/lib/admin/ai-cost.server.ts</code> — chỉnh nếu Lovable cập nhật giá.
      </p>
    </div>
  );
}

function RollupRow({ r }: { r: AiUsageRollup }) {
  return (
    <tr className="border-t border-border/60">
      <td className="px-4 py-2 font-medium">{r.source}</td>
      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.model}</td>
      <td className="px-4 py-2 text-right tabular-nums">{r.calls.toLocaleString("vi-VN")}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${r.errors > 0 ? "text-[var(--down)]" : "text-muted-foreground"}`}>
        {r.errors}
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.totalTokens.toLocaleString("vi-VN")}</td>
      <td className="px-4 py-2 text-right tabular-nums font-medium">{fmtUsd(r.estimatedCostUsd)}</td>
    </tr>
  );
}

function RecentRow({ r }: { r: AiUsageRecent }) {
  const isErr = r.status !== "ok";
  return (
    <tr className="border-t border-border/60">
      <td className="px-4 py-2 text-xs text-muted-foreground">{fmtTime(r.createdAt)}</td>
      <td className="px-4 py-2 text-xs">{r.source}</td>
      <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{r.model}</td>
      <td className="px-4 py-2 text-right tabular-nums text-xs">{r.promptTokens.toLocaleString("vi-VN")}</td>
      <td className="px-4 py-2 text-right tabular-nums text-xs">{r.completionTokens.toLocaleString("vi-VN")}</td>
      <td className="px-4 py-2 text-right tabular-nums text-xs">{fmtUsd(r.estimatedCostUsd)}</td>
      <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground">{r.durationMs ?? "—"}</td>
      <td className="px-4 py-2 text-xs">
        {isErr ? (
          <span className="inline-flex items-center gap-1 text-[var(--down)]" title={r.errorMessage ?? undefined}>
            <AlertTriangle className="h-3 w-3" />
            {r.errorMessage ? r.errorMessage.slice(0, 40) : "error"}
          </span>
        ) : (
          <span className="text-[var(--up)]">ok</span>
        )}
      </td>
    </tr>
  );
}

function DailyChart({ data }: { data: Array<{ date: string; calls: number; errors: number; cost: number }> }) {
  const max = Math.max(0.000001, ...data.map((d) => d.cost));
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d) => {
          const h = max > 0 ? Math.max(2, (d.cost / max) * 110) : 2;
          const bg = d.errors > 0
            ? "var(--down)"
            : d.cost > 0
            ? "var(--gold)"
            : "color-mix(in oklab, var(--muted-foreground) 18%, transparent)";
          return (
            <div
              key={d.date}
              title={`${d.date} — ${d.calls} lần · ${fmtUsd(d.cost)}${d.errors ? ` · ${d.errors} lỗi` : ""}`}
              className="flex-1 rounded-sm"
              style={{ height: h, background: bg, opacity: d.cost > 0 ? 1 : 0.5 }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date ?? ""}</span>
        <span>{data[data.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}

function Stat({
  label, value, sub, icon: Icon, tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "up" | "down";
}) {
  const iconBg =
    tone === "up"
      ? "bg-[var(--up)]/10 text-[var(--up)]"
      : tone === "down"
      ? "bg-[var(--down)]/10 text-[var(--down)]"
      : "bg-muted/40 text-muted-foreground";
  const subTone =
    tone === "up" ? "text-[var(--up)]" : tone === "down" ? "text-[var(--down)]" : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-1.5 font-display text-2xl">{value}</div>
          {sub && <div className={`mt-1 text-[11px] ${subTone}`}>{sub}</div>}
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}