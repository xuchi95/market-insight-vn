import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DollarSign, RefreshCw, TrendingUp, MousePointerClick, Eye, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getAdsenseReport, type AdsenseBreakdownRow } from "@/lib/admin/adsense.functions";

export const Route = createFileRoute("/_admin/mw-admin/adsense")({
  component: AdsensePage,
});

const RANGES = [7, 30, 90] as const;

function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
function fmtInt(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function AdsensePage() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const fetchReport = useServerFn(getAdsenseReport);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin", "adsense", rangeDays],
    queryFn: () => fetchReport({ data: { rangeDays } }),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--gold)]">
            Doanh thu quảng cáo
          </div>
          <h1 className="font-display text-2xl">AdSense</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Số liệu lấy trực tiếp từ Google AdSense Management API. Dữ liệu doanh thu là{" "}
            <em>ước tính</em> và có thể chậm vài giờ so với báo cáo trên dashboard Google.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRangeDays(r)}
                className={`px-2.5 py-1 text-xs rounded ${
                  rangeDays === r
                    ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r} ngày
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {data && !data.configured && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500" />
            <div className="space-y-2">
              <p className="font-medium">AdSense chưa được cấu hình.</p>
              <p className="text-muted-foreground">
                Cần 3 secrets: <code>GOOGLE_ADSENSE_CLIENT_ID</code>,{" "}
                <code>GOOGLE_ADSENSE_CLIENT_SECRET</code>,{" "}
                <code>GOOGLE_ADSENSE_REFRESH_TOKEN</code>. Tạo OAuth Client (Web) trên Google
                Cloud Console, bật AdSense Management API, scope <code>adsense.readonly</code>,
                lấy refresh token qua OAuth Playground.
              </p>
            </div>
          </div>
        </div>
      )}

      {data?.configured && data.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {data.error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Đang tải dữ liệu AdSense…
        </div>
      )}

      {data?.configured && !data.error && (
        <>
          {data.account && (
            <div className="text-xs text-muted-foreground">
              Account: <span className="text-foreground">{data.account.displayName}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              icon={DollarSign}
              label={`Doanh thu ${data.rangeDays}d`}
              value={fmtMoney(data.kpis.earnings, data.currency)}
            />
            <Stat
              icon={Eye}
              label="Impressions"
              value={fmtInt(data.kpis.impressions)}
            />
            <Stat
              icon={MousePointerClick}
              label={`Clicks · CTR ${fmtPct(data.kpis.ctr)}`}
              value={fmtInt(data.kpis.clicks)}
            />
            <Stat
              icon={TrendingUp}
              label="RPM TB"
              value={fmtMoney(data.kpis.rpm, data.currency)}
            />
          </div>

          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-medium mb-3">Doanh thu theo ngày</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="date" fontSize={11} tickMargin={6} />
                  <YAxis fontSize={11} width={50} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === "earnings" ? fmtMoney(v, data.currency) : fmtInt(v)
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="var(--gold)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              title="Top Ad Units"
              rows={data.byAdUnit}
              currency={data.currency}
            />
            <BreakdownTable
              title="Top URL"
              rows={data.byUrl}
              currency={data.currency}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-display text-xl">{value}</div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: AdsenseBreakdownRow[];
  currency: string;
}) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-2 text-sm font-medium">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Tên</th>
              <th className="text-right px-3 py-2">Doanh thu</th>
              <th className="text-right px-3 py-2">Imp.</th>
              <th className="text-right px-3 py-2">Clicks</th>
              <th className="text-right px-3 py-2">RPM</th>
              <th className="text-right px-3 py-2">CTR</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.label} className="border-t border-border/60">
                  <td className="px-3 py-2 truncate max-w-[240px]" title={r.label}>
                    {r.label}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {fmtMoney(r.earnings, currency)}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">{fmtInt(r.impressions)}</td>
                  <td className="text-right px-3 py-2 tabular-nums">{fmtInt(r.clicks)}</td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {fmtMoney(r.rpm, currency)}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">{fmtPct(r.ctr)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}