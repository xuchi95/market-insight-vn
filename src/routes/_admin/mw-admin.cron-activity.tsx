import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { getCronActivity, type CronJobSummary, type CronTimelinePoint } from "@/lib/admin/cron-activity.functions";

export const Route = createFileRoute("/_admin/mw-admin/cron-activity")({
  component: CronActivityPage,
});

const WINDOWS = [
  { label: "60 phút", value: 60 },
  { label: "3 giờ", value: 180 },
  { label: "12 giờ", value: 720 },
  { label: "24 giờ", value: 1440 },
] as const;

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { hour12: false });
}

function CronActivityPage() {
  const [minutes, setMinutes] = useState<number>(60);
  const fetchActivity = useServerFn(getCronActivity);
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["admin", "cron-activity", minutes],
    queryFn: () => fetchActivity({ data: { minutes } }),
    refetchInterval: 30_000, // tự refresh 30s — đủ phát hiện đột biến sớm
    refetchOnWindowFocus: true,
  });

  const jobs = data?.jobs ?? [];
  const timeline = data?.timeline ?? [];

  const totals = useMemo(() => {
    const runs24h = jobs.reduce((s, j) => s + j.runs_24h, 0);
    const failures24h = jobs.reduce((s, j) => s + j.failures_24h, 0);
    const runs1h = jobs.reduce((s, j) => s + j.runs_1h, 0);
    const alertJobs = jobs.filter((j) => j.alerts.length > 0).length;
    return { runs24h, failures24h, runs1h, alertJobs };
  }, [jobs]);

  // Heatmap: minute buckets × jobs. Trục thời gian dày đặc → chỉ render khi
  // có dữ liệu để dễ scan "vạch cao bất thường".
  const heatmap = useMemo(() => buildHeatmap(timeline, minutes), [timeline, minutes]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--gold)]">
            Cloud & AI
          </div>
          <h1 className="font-display text-2xl">Hoạt động cron</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tần suất chạy & lỗi của từng cron để phát hiện sớm cron đốt tài nguyên bất thường.
            Tự refresh mỗi 30 giây.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-card p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                onClick={() => setMinutes(w.value)}
                className={`rounded px-3 py-1.5 text-xs ${
                  minutes === w.value
                    ? "bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] text-[var(--gold)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.label}
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

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tổng lần chạy 24h" value={totals.runs24h.toLocaleString("vi-VN")} icon={Activity} />
        <Stat
          label="Lỗi 24h"
          value={totals.failures24h.toLocaleString("vi-VN")}
          icon={AlertTriangle}
          tone={totals.failures24h > 0 ? "down" : "default"}
        />
        <Stat label="Lần chạy 1h qua" value={totals.runs1h.toLocaleString("vi-VN")} icon={Clock} />
        <Stat
          label="Cron có cảnh báo"
          value={totals.alertJobs}
          icon={AlertTriangle}
          tone={totals.alertJobs > 0 ? "down" : "up"}
        />
      </div>

      {error && (
        <div className="rounded-md border border-[var(--down)]/40 bg-[var(--down)]/5 p-3 text-sm text-[var(--down)]">
          Lỗi tải dữ liệu: {(error as Error).message}
        </div>
      )}

      {/* Per-job table */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base">Cron jobs (sắp xếp theo lần chạy/24h)</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Job</th>
                <th className="px-4 py-2 text-left">Schedule</th>
                <th className="px-4 py-2 text-right">1h</th>
                <th className="px-4 py-2 text-right">24h</th>
                <th className="px-4 py-2 text-right">Lỗi 24h</th>
                <th className="px-4 py-2 text-right">Avg ms</th>
                <th className="px-4 py-2 text-left">Lần cuối</th>
                <th className="px-4 py-2 text-left">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!isLoading && jobs.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Không có cron nào.</td></tr>
              )}
              {jobs.map((j) => (
                <JobRow key={j.jobid} job={j} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-minute heatmap */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base">
            Bản đồ nhiệt theo phút — {WINDOWS.find((w) => w.value === minutes)?.label}
          </h2>
          <p className="text-xs text-muted-foreground">
            Mỗi ô = 1 phút. Ô càng đậm = cron chạy càng nhiều lần trong phút đó.
            Vệt đỏ = có lần fail. Vạch dài bất thường so với các dòng khác = cron đang đốt tài nguyên.
          </p>
        </header>
        <div className="overflow-x-auto p-4">
          {heatmap.jobs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Chưa có lần chạy nào trong khoảng này.</div>
          ) : (
            <Heatmap heatmap={heatmap} />
          )}
        </div>
      </section>

      {data?.fetchedAt && (
        <p className="text-right text-[11px] text-muted-foreground">
          Cập nhật: {formatTime(data.fetchedAt)}
        </p>
      )}
    </div>
  );
}

function JobRow({ job }: { job: CronJobSummary }) {
  const failRate = job.runs_24h > 0 ? job.failures_24h / job.runs_24h : 0;
  return (
    <tr className="border-t border-border/60">
      <td className="px-4 py-2 font-medium">
        <div className="flex items-center gap-2">
          {job.active ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--up)]" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          )}
          <span>{job.jobname}</span>
        </div>
      </td>
      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{job.schedule}</td>
      <td className="px-4 py-2 text-right tabular-nums">{job.runs_1h}</td>
      <td className="px-4 py-2 text-right tabular-nums">{job.runs_24h.toLocaleString("vi-VN")}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${failRate >= 0.5 ? "text-[var(--down)]" : ""}`}>
        {job.failures_24h}
        {job.runs_24h > 0 && job.failures_24h > 0 && (
          <span className="ml-1 text-[10px] opacity-70">({Math.round(failRate * 100)}%)</span>
        )}
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
        {job.avg_duration_ms > 0 ? Math.round(job.avg_duration_ms) : "—"}
      </td>
      <td className="px-4 py-2 text-xs text-muted-foreground">{formatTime(job.last_start)}</td>
      <td className="px-4 py-2 text-xs">
        {job.alerts.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {job.alerts.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 text-[var(--down)]">
                <AlertTriangle className="h-3 w-3" />{a}
              </span>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

/* ---------- Heatmap helpers ---------- */

interface HeatmapData {
  jobs: string[];
  buckets: string[]; // ISO timestamps, oldest → newest
  cell: Map<string, { runs: number; failures: number }>; // key = jobname|bucket
  max: number;
}

function buildHeatmap(timeline: CronTimelinePoint[], minutes: number): HeatmapData {
  const now = Date.now();
  // Sample cadence để không vẽ 1440 cột (24h × 60). Mỗi cột ≤ ~120 ô.
  const bucketMinutes = minutes <= 60 ? 1 : minutes <= 180 ? 2 : minutes <= 720 ? 6 : 12;
  const colCount = Math.ceil(minutes / bucketMinutes);
  const startMs = now - colCount * bucketMinutes * 60_000;

  const buckets: string[] = [];
  for (let i = 0; i < colCount; i++) {
    buckets.push(new Date(startMs + i * bucketMinutes * 60_000).toISOString());
  }

  const jobSet = new Set<string>();
  const cell = new Map<string, { runs: number; failures: number }>();
  let max = 0;

  for (const t of timeline) {
    jobSet.add(t.jobname);
    const ms = new Date(t.bucket).getTime();
    const idx = Math.floor((ms - startMs) / (bucketMinutes * 60_000));
    if (idx < 0 || idx >= colCount) continue;
    const key = `${t.jobname}|${buckets[idx]}`;
    const prev = cell.get(key) ?? { runs: 0, failures: 0 };
    prev.runs += t.runs;
    prev.failures += t.failures;
    cell.set(key, prev);
    if (prev.runs > max) max = prev.runs;
  }

  const jobs = Array.from(jobSet).sort();
  return { jobs, buckets, cell, max };
}

function Heatmap({ heatmap }: { heatmap: HeatmapData }) {
  const { jobs, buckets, cell, max } = heatmap;
  return (
    <div className="min-w-[640px]">
      <div className="space-y-1">
        {jobs.map((job) => (
          <div key={job} className="flex items-center gap-2">
            <div className="w-44 shrink-0 truncate text-right text-[11px] text-muted-foreground" title={job}>
              {job}
            </div>
            <div
              className="flex flex-1 gap-px"
              style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
            >
              {buckets.map((b) => {
                const c = cell.get(`${job}|${b}`);
                const runs = c?.runs ?? 0;
                const failures = c?.failures ?? 0;
                const intensity = max > 0 ? runs / max : 0;
                const bg = failures > 0
                  ? `color-mix(in oklab, var(--down) ${Math.max(intensity, 0.3) * 100}%, transparent)`
                  : runs > 0
                  ? `color-mix(in oklab, var(--gold) ${Math.max(intensity * 100, 12)}%, transparent)`
                  : "color-mix(in oklab, var(--muted-foreground) 6%, transparent)";
                return (
                  <div
                    key={b}
                    title={`${new Date(b).toLocaleTimeString("vi-VN", { hour12: false })} — ${runs} chạy${failures ? ` / ${failures} lỗi` : ""}`}
                    className="h-4 flex-1 rounded-[2px]"
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{new Date(buckets[0]).toLocaleTimeString("vi-VN", { hour12: false })}</span>
        <span>← cũ — mới →</span>
        <span>{new Date(buckets[buckets.length - 1]).toLocaleTimeString("vi-VN", { hour12: false })}</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "up" | "down";
}) {
  const iconBg =
    tone === "up"
      ? "bg-[var(--up)]/10 text-[var(--up)]"
      : tone === "down"
      ? "bg-[var(--down)]/10 text-[var(--down)]"
      : "bg-muted/40 text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-1.5 font-display text-2xl">{value}</div>
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}