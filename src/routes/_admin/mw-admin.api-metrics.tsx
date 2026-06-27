import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  DollarSign,
  Gauge,
  RefreshCw,
  Server,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getApiMetrics } from "@/lib/admin/api-metrics.functions";

export const Route = createFileRoute("/_admin/mw-admin/api-metrics")({
  component: ApiMetricsPage,
});

const WINDOWS = [
  { label: "60 phút", value: 60 },
  { label: "6 giờ", value: 360 },
  { label: "24 giờ", value: 1440 > 720 ? 720 : 1440 }, // server caps at 720
] as const;

const fmtInt = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n));
const fmtMs = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n.toFixed(0)}ms`;
const fmtUsd = (n: number) =>
  n >= 1
    ? `$${n.toFixed(2)}`
    : n >= 0.01
    ? `$${n.toFixed(4)}`
    : `$${n.toFixed(6)}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

function ApiMetricsPage() {
  const [windowMin, setWindowMin] = useState<number>(60);
  const fn = useServerFn(getApiMetrics);
  const q = useQuery({
    queryKey: ["api-metrics", windowMin],
    queryFn: () => fn({ data: { windowMin } }),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const totals = q.data?.totals;
  const cost = q.data?.cost;
  const series =
    q.data?.series.map((s) => ({
      ts: s.ts,
      label: new Date(s.ts).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      count: s.count,
      errors: s.errors,
    })) ?? [];
  const endpoints = q.data?.endpoints ?? [];
  const maxEndpoint = endpoints[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between border-b border-border/60 pb-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]/80 mb-1.5">
            Quan trắc · Lovable Cloud
          </div>
          <h1 className="font-display text-2xl md:text-3xl tracking-tight truncate">
            API Metrics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request/phút theo endpoint và ước tính chi phí Cloud theo thời gian
            thực. Tự động làm mới mỗi 10 giây.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-lg border border-border/60 bg-card/60 p-1">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWindowMin(w.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  windowMin === w.value
                    ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => q.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Làm mới"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          icon={Gauge}
          label="Req/phút (5p gần nhất)"
          value={fmtInt(totals?.req_per_min ?? 0)}
          tone="primary"
          hint={`${fmtInt(totals?.count ?? 0)} request / ${windowMin}p`}
        />
        <Kpi
          icon={Timer}
          label="Độ trễ trung bình"
          value={fmtMs(totals?.avg_ms ?? 0)}
          hint="wall-clock duration"
        />
        <Kpi
          icon={AlertCircle}
          label="Tỷ lệ lỗi"
          value={fmtPct(totals?.error_rate ?? 0)}
          tone={
            (totals?.error_rate ?? 0) > 0.02
              ? "down"
              : (totals?.error_rate ?? 0) > 0
              ? "warn"
              : "up"
          }
          hint={`${fmtInt(totals?.errors ?? 0)} lỗi`}
        />
        <Kpi
          icon={DollarSign}
          label="Chi phí ước tính"
          value={fmtUsd(cost?.per_hour_usd ?? 0) + "/h"}
          tone="gold"
          hint={`≈ ${fmtUsd(cost?.per_month_usd ?? 0)} / 30 ngày`}
        />
      </div>

      {/* Series chart */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
              Throughput
            </div>
            <h2 className="font-display text-lg md:text-xl">
              Request mỗi phút
            </h2>
          </div>
          <span className="text-[11px] tabular text-muted-foreground/80">
            {series.length} bucket · cửa sổ {windowMin}p
          </span>
        </div>
        <div className="h-64">
          {series.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              {q.isLoading
                ? "Đang tải…"
                : "Chưa có dữ liệu — chờ vài request đầu tiên được flush (≤15s)."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="apiCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name) => [fmtInt(v), name === "count" ? "Request" : "Lỗi"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  fill="url(#apiCount)"
                />
                <Area
                  type="monotone"
                  dataKey="errors"
                  stroke="var(--down)"
                  strokeWidth={1.5}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Endpoints + cost breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <section className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                Phân phối
              </div>
              <h2 className="font-display text-lg md:text-xl">
                Theo endpoint
              </h2>
            </div>
            <span className="text-[11px] tabular text-muted-foreground/80">
              {endpoints.length} endpoint
            </span>
          </div>
          {endpoints.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Chưa có dữ liệu trong cửa sổ này.
            </div>
          ) : (
            <ul className="space-y-2">
              {endpoints.map((e) => {
                const pct = maxEndpoint > 0 ? (e.count / maxEndpoint) * 100 : 0;
                return (
                  <li
                    key={e.endpoint}
                    className="relative overflow-hidden rounded-lg border border-border/40 bg-background/40 p-3"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-[var(--gold)]/8"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[13px] text-foreground truncate">
                          {e.endpoint}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground tabular">
                          <span>{fmtMs(e.avg_ms)} TB</span>
                          {e.error_rate > 0 && (
                            <span className="text-[var(--down)]">
                              {fmtPct(e.error_rate)} lỗi
                            </span>
                          )}
                          <span>{fmtUsd(e.cost_usd)}</span>
                        </div>
                      </div>
                      <div className="text-right tabular shrink-0">
                        <div className="font-display text-lg leading-none text-foreground">
                          {fmtInt(e.count)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                          req
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_22%,var(--border))] bg-gradient-to-br from-[color-mix(in_oklab,var(--gold)_8%,transparent)] to-transparent p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-grid h-9 w-9 place-items-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)]">
              <Server className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]/80">
                Cloud cost
              </div>
              <h2 className="font-display text-lg">Ước tính chi phí</h2>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <Row label={`Trong cửa sổ ${windowMin}p`} value={fmtUsd(cost?.window_usd ?? 0)} />
            <Row label="Trung bình mỗi giờ" value={fmtUsd(cost?.per_hour_usd ?? 0)} />
            <Row label="Dự kiến / ngày" value={fmtUsd(cost?.per_day_usd ?? 0)} />
            <Row
              label="Dự kiến / 30 ngày"
              value={fmtUsd(cost?.per_month_usd ?? 0)}
              accent
            />
          </dl>
          <div className="mt-4 pt-4 border-t border-border/40 text-[11px] text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground/80 mb-1">Công thức</p>
            <p className="font-mono">
              cost = req × {cost?.rates.perMillionRequests ?? 0}/M + ms ×{" "}
              {cost?.rates.perMillionDurationMs ?? 0}/M
            </p>
            <p className="mt-2">
              Dựa trên giá Cloudflare Workers Paid. Dùng wall-clock duration làm
              giới hạn trên cho CPU-ms; chi phí thực có thể thấp hơn.
            </p>
          </div>
        </section>
      </div>

      <p className="text-[11px] text-muted-foreground/70 inline-flex items-center gap-1.5">
        <Activity className="h-3 w-3" />
        Chỉ ghi nhận các endpoint <span className="font-mono">/api/public/*</span> đã
        bật instrumentation. Buffer flush mỗi 15s.
      </p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "up" | "down" | "warn" | "gold";
}) {
  const palette: Record<string, string> = {
    default: "bg-muted/40 text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    up: "bg-[var(--up)]/10 text-[var(--up)]",
    down: "bg-[var(--down)]/10 text-[var(--down)]",
    warn: "bg-amber-500/10 text-amber-500",
    gold: "bg-[var(--gold)]/15 text-[var(--gold)]",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
          {label}
        </span>
        <span className={`inline-grid h-8 w-8 place-items-center rounded-lg ${palette[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="font-display text-2xl md:text-3xl leading-none tabular text-foreground">
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-[11px] text-muted-foreground tabular">{hint}</div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`tabular font-medium ${
          accent ? "text-[var(--gold)] text-lg" : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}