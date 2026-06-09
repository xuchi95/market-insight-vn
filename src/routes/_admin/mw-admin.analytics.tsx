import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getAnalyticsOverview,
  getAnalyticsTimeseries,
  getAnalyticsHeatmap,
  getTopRoutes,
  getTopPlacements,
  getAnalyticsFunnel,
} from "@/lib/admin/analytics.functions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/_admin/mw-admin/analytics")({
  component: AnalyticsPage,
});

const RANGES = [7, 30, 90] as const;

function pct(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(",")]
    .concat(rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const overviewFn = useServerFn(getAnalyticsOverview);
  const timeseriesFn = useServerFn(getAnalyticsTimeseries);
  const heatmapFn = useServerFn(getAnalyticsHeatmap);
  const topRoutesFn = useServerFn(getTopRoutes);
  const topPlacementsFn = useServerFn(getTopPlacements);
  const funnelFn = useServerFn(getAnalyticsFunnel);

  const overview = useQuery({ queryKey: ["an-ov", days], queryFn: () => overviewFn({ data: { days } }) });
  const timeseries = useQuery({ queryKey: ["an-ts", days], queryFn: () => timeseriesFn({ data: { days } }) });
  const heatmap = useQuery({ queryKey: ["an-hm", days], queryFn: () => heatmapFn({ data: { days } }) });
  const topRoutes = useQuery({ queryKey: ["an-tr", days], queryFn: () => topRoutesFn({ data: { days } }) });
  const topPlacements = useQuery({ queryKey: ["an-tp", days], queryFn: () => topPlacementsFn({ data: { days } }) });
  const funnel = useQuery({ queryKey: ["an-fn", days], queryFn: () => funnelFn({ data: { days } }) });

  const cur = overview.data?.current;
  const prev = overview.data?.previous;
  const maxHeat = Math.max(1, ...(heatmap.data?.matrix.flat() ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Analytics</h1>
          <p className="text-sm text-muted-foreground">Hành vi người dùng + hiệu quả quảng cáo trong {days} ngày qua.</p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setDays(r)}
              className={`px-3 py-1.5 rounded ${days === r ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : "text-muted-foreground hover:text-foreground"}`}>
              {r} ngày
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { k: "Pageviews", v: cur?.pageviews ?? 0, p: prev?.pageviews ?? 0 },
          { k: "Unique", v: cur?.uniques ?? 0, p: prev?.uniques ?? 0 },
          { k: "Sessions", v: cur?.sessions ?? 0, p: prev?.sessions ?? 0 },
          { k: "Ad impressions", v: cur?.adImpressions ?? 0, p: prev?.adImpressions ?? 0 },
          { k: "Ad clicks", v: cur?.adClicks ?? 0, p: prev?.adClicks ?? 0 },
          { k: "Avg dwell (s)", v: Math.round(cur?.avgDwell ?? 0), p: Math.round(prev?.avgDwell ?? 0) },
        ].map((c) => {
          const delta = pct(c.v, c.p);
          return (
            <div key={c.k} className="rounded-lg border border-border bg-card/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.k}</div>
              <div className="mt-1 font-display text-xl">{fmt(c.v)}</div>
              <div className={`text-xs ${delta >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card/40 p-3 text-sm">
        CTR quảng cáo: <span className="font-semibold">{((cur?.ctr ?? 0) * 100).toFixed(2)}%</span>
      </div>

      {/* Timeseries */}
      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="mb-3 text-sm font-semibold">Pageviews & quảng cáo theo ngày</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries.data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="pageviews" stroke="#f5b400" />
              <Line type="monotone" dataKey="ad_view" stroke="#22c55e" />
              <Line type="monotone" dataKey="ad_click" stroke="#ef4444" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Heatmap */}
      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="mb-3 text-sm font-semibold">Heatmap pageviews theo giờ (CN→T7)</h2>
        <div className="overflow-x-auto">
          <table className="text-[10px]">
            <tbody>
              {(heatmap.data?.matrix ?? []).map((row, d) => (
                <tr key={d}>
                  <td className="pr-2 text-muted-foreground">{["CN","T2","T3","T4","T5","T6","T7"][d]}</td>
                  {row.map((v, h) => (
                    <td key={h} title={`${v}`} className="h-5 w-5"
                      style={{ background: `color-mix(in oklab, var(--gold) ${(v / maxHeat) * 100}%, transparent)` }} />
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {Array.from({ length: 24 }).map((_, h) => (
                  <td key={h} className="text-center text-muted-foreground">{h % 6 === 0 ? h : ""}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Top routes + placements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Top routes</h2>
            <button onClick={() => exportCsv("top-routes", topRoutes.data?.top ?? [])} className="text-xs text-muted-foreground hover:text-foreground">CSV</button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left">Route</th><th className="text-right">Views</th></tr></thead>
            <tbody>
              {(topRoutes.data?.top ?? []).map((r) => (
                <tr key={r.route} className="border-t border-border/40"><td className="py-1.5 truncate max-w-[260px]">{r.route}</td><td className="text-right">{fmt(r.views)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-border bg-card/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Top ad placements</h2>
            <button onClick={() => exportCsv("top-placements", topPlacements.data?.top ?? [])} className="text-xs text-muted-foreground hover:text-foreground">CSV</button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left">Placement</th><th className="text-right">Impr.</th><th className="text-right">Clicks</th><th className="text-right">CTR</th></tr></thead>
            <tbody>
              {(topPlacements.data?.top ?? []).map((p) => (
                <tr key={p.placement} className="border-t border-border/40">
                  <td className="py-1.5">{p.placement}</td>
                  <td className="text-right">{fmt(p.impressions)}</td>
                  <td className="text-right">{fmt(p.clicks)}</td>
                  <td className="text-right">{(p.ctr * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Funnel */}
      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="mb-3 text-sm font-semibold">Funnel</h2>
        <div className="space-y-1.5">
          {(funnel.data?.steps ?? []).map((s) => (
            <div key={s.step} className="flex items-center gap-2 text-sm">
              <span className="w-40 truncate text-muted-foreground">{s.step}</span>
              <div className="h-5 flex-1 rounded bg-muted">
                <div className="h-full rounded bg-[var(--gold)]" style={{ width: `${Math.min(100, s.users)}%` }} />
              </div>
              <span className="w-16 text-right">{fmt(s.users)}</span>
            </div>
          ))}
          {(!funnel.data?.steps?.length) && <p className="text-xs text-muted-foreground">Chưa có funnel_step. Hãy gọi <code>trackFunnel("watchlist.add")</code> tại CTA.</p>}
        </div>
      </section>
    </div>
  );
}