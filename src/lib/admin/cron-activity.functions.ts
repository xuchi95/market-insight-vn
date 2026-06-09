import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface CronJobSummary {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  runs_24h: number;
  failures_24h: number;
  runs_1h: number;
  failures_1h: number;
  last_start: string | null;
  last_status: string | null;
  last_message: string | null;
  avg_duration_ms: number;
  /** runs/day so user thấy ngay cron nào "ồn" nhất */
  runs_per_day_est: number;
  /** Cảnh báo: fail rate cao, hoặc tần suất > ngưỡng. */
  alerts: string[];
}

export interface CronTimelinePoint {
  bucket: string;
  jobname: string;
  runs: number;
  failures: number;
}

export interface CronActivityResponse {
  jobs: CronJobSummary[];
  timeline: CronTimelinePoint[];
  windowMinutes: number;
  fetchedAt: string;
}

const InputSchema = z.object({
  minutes: z.number().int().min(15).max(1440).default(60),
});

function annotate(row: Omit<CronJobSummary, "alerts" | "runs_per_day_est">): CronJobSummary {
  const alerts: string[] = [];
  const failRate24 = row.runs_24h > 0 ? row.failures_24h / row.runs_24h : 0;
  if (row.runs_24h >= 10 && failRate24 >= 0.5) {
    alerts.push(`Tỉ lệ lỗi ${Math.round(failRate24 * 100)}% trong 24h`);
  }
  if (row.runs_1h > 600) {
    alerts.push(`Tần suất cao bất thường: ${row.runs_1h} lần/giờ`);
  } else if (row.runs_1h > 120) {
    alerts.push(`Chạy ${row.runs_1h} lần trong 1 giờ qua`);
  }
  if (!row.active) alerts.push("Đang tắt");
  return {
    ...row,
    runs_per_day_est: row.runs_24h,
    alerts,
  };
}

export const getCronActivity = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { minutes?: number } | undefined) => InputSchema.parse(d ?? {}))
  .handler(async ({ data }): Promise<CronActivityResponse> => {
    const [summaryRes, timelineRes] = await Promise.all([
      supabaseAdmin.rpc("admin_cron_job_summary" as never) as unknown as Promise<{
        data: Array<Omit<CronJobSummary, "alerts" | "runs_per_day_est">> | null;
        error: { message: string } | null;
      }>,
      supabaseAdmin.rpc("admin_cron_minute_timeline" as never, {
        p_minutes: data.minutes,
      } as never) as unknown as Promise<{
        data: CronTimelinePoint[] | null;
        error: { message: string } | null;
      }>,
    ]);

    if (summaryRes.error) throw new Error("cron summary: " + summaryRes.error.message);
    if (timelineRes.error) throw new Error("cron timeline: " + timelineRes.error.message);

    const jobs = (summaryRes.data ?? []).map((r) => annotate({
      ...r,
      avg_duration_ms: Number(r.avg_duration_ms ?? 0),
      runs_24h: Number(r.runs_24h ?? 0),
      failures_24h: Number(r.failures_24h ?? 0),
      runs_1h: Number(r.runs_1h ?? 0),
      failures_1h: Number(r.failures_1h ?? 0),
    }));

    return {
      jobs,
      timeline: (timelineRes.data ?? []).map((t) => ({
        ...t,
        runs: Number(t.runs),
        failures: Number(t.failures),
      })),
      windowMinutes: data.minutes,
      fetchedAt: new Date().toISOString(),
    };
  });