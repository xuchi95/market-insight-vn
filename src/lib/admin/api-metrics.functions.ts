import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  windowMin: z.number().int().min(5).max(720).default(60),
});

/**
 * Cloudflare Workers Paid pricing (approximate, used only for UI estimate):
 *   $0.30 per 1M requests
 *   $0.02 per 1M CPU-ms (server CPU). We use wall-clock duration as an
 *   upper-bound proxy since we don't have isolated CPU samples.
 *
 * These constants live in code so admins can tune later if Cloudflare
 * pricing changes. The admin page displays the formula transparently.
 */
export const CLOUD_COST = {
  perMillionRequests: 0.3,
  perMillionDurationMs: 0.02,
} as const;

export const getApiMetrics = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { windowMin?: number }) => InputSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - data.windowMin * 60_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("api_request_metrics")
      .select("bucket_minute, endpoint, count, total_duration_ms, errors")
      .gte("bucket_minute", since)
      .order("bucket_minute", { ascending: true })
      .limit(20000);
    if (error) throw new Error(error.message);

    type Row = {
      bucket_minute: string;
      endpoint: string;
      count: number;
      total_duration_ms: number;
      errors: number;
    };
    const data_ = (rows ?? []) as Row[];

    // per-minute totals across all endpoints
    const perMinute = new Map<string, { ts: string; count: number; errors: number }>();
    // per-endpoint aggregates over the window
    const perEndpoint = new Map<
      string,
      { endpoint: string; count: number; errors: number; total_ms: number }
    >();

    let totalCount = 0;
    let totalErrors = 0;
    let totalMs = 0;

    for (const r of data_) {
      totalCount += r.count;
      totalErrors += r.errors;
      totalMs += r.total_duration_ms;

      const m = perMinute.get(r.bucket_minute) ?? {
        ts: r.bucket_minute,
        count: 0,
        errors: 0,
      };
      m.count += r.count;
      m.errors += r.errors;
      perMinute.set(r.bucket_minute, m);

      const e = perEndpoint.get(r.endpoint) ?? {
        endpoint: r.endpoint,
        count: 0,
        errors: 0,
        total_ms: 0,
      };
      e.count += r.count;
      e.errors += r.errors;
      e.total_ms += r.total_duration_ms;
      perEndpoint.set(r.endpoint, e);
    }

    const series = Array.from(perMinute.values()).sort((a, b) =>
      a.ts.localeCompare(b.ts),
    );
    const endpoints = Array.from(perEndpoint.values())
      .map((e) => ({
        endpoint: e.endpoint,
        count: e.count,
        errors: e.errors,
        avg_ms: e.count > 0 ? e.total_ms / e.count : 0,
        error_rate: e.count > 0 ? e.errors / e.count : 0,
        // per-endpoint cost share
        cost_usd:
          (e.count / 1_000_000) * CLOUD_COST.perMillionRequests +
          (e.total_ms / 1_000_000) * CLOUD_COST.perMillionDurationMs,
      }))
      .sort((a, b) => b.count - a.count);

    // rolling req/min over the last 5 buckets
    const recent = series.slice(-5);
    const recentReq = recent.reduce((s, r) => s + r.count, 0);
    const reqPerMin = recent.length > 0 ? recentReq / recent.length : 0;

    // window cost + projection
    const costWindow =
      (totalCount / 1_000_000) * CLOUD_COST.perMillionRequests +
      (totalMs / 1_000_000) * CLOUD_COST.perMillionDurationMs;
    const windowHours = data.windowMin / 60;
    const costPerHour = windowHours > 0 ? costWindow / windowHours : 0;

    return {
      windowMin: data.windowMin,
      generatedAt: new Date().toISOString(),
      totals: {
        count: totalCount,
        errors: totalErrors,
        avg_ms: totalCount > 0 ? totalMs / totalCount : 0,
        error_rate: totalCount > 0 ? totalErrors / totalCount : 0,
        req_per_min: reqPerMin,
      },
      cost: {
        window_usd: costWindow,
        per_hour_usd: costPerHour,
        per_day_usd: costPerHour * 24,
        per_month_usd: costPerHour * 24 * 30,
        rates: CLOUD_COST,
      },
      series,
      endpoints,
    };
  });