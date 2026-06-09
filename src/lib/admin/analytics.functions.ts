import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RangeSchema = z.object({
  days: z.number().int().min(1).max(90).default(30),
});

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export const getAnalyticsOverview = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { days?: number }) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const since = sinceIso(data.days);
    const prevSince = sinceIso(data.days * 2);
    const prevUntil = since;

    type Row = { event_type: string; session_id: string | null; anon_id: string | null; value: number | null };
    const fetchRange = async (gte: string, lt?: string): Promise<Row[]> => {
      let q = supabaseAdmin
        .from("analytics_events")
        .select("event_type, session_id, anon_id, value")
        .gte("ts", gte);
      if (lt) q = q.lt("ts", lt);
      const { data: rows, error } = await q.limit(50000);
      if (error) throw new Error(error.message);
      return (rows ?? []) as Row[];
    };

    const summarize = (rows: Row[]) => {
      let pageviews = 0, adView = 0, adRender = 0, adRequest = 0, adClick = 0;
      let dwellSum = 0, dwellCount = 0;
      const sessions = new Set<string>();
      const anons = new Set<string>();
      for (const r of rows) {
        if (r.session_id) sessions.add(r.session_id);
        if (r.anon_id) anons.add(r.anon_id);
        if (r.event_type === "pageview") pageviews++;
        else if (r.event_type === "ad_view") adView++;
        else if (r.event_type === "ad_render") adRender++;
        else if (r.event_type === "ad_request") adRequest++;
        else if (r.event_type === "ad_click") adClick++;
        else if (r.event_type === "dwell" && r.value != null) {
          dwellSum += Number(r.value);
          dwellCount++;
        }
      }
      return {
        pageviews,
        sessions: sessions.size,
        uniques: anons.size,
        adImpressions: adView,
        adRenders: adRender,
        adRequests: adRequest,
        adClicks: adClick,
        ctr: adView > 0 ? adClick / adView : 0,
        fillRate: adRequest > 0 ? adRender / adRequest : 0,
        avgDwell: dwellCount > 0 ? dwellSum / dwellCount : 0,
      };
    };

    const [cur, prev] = await Promise.all([
      fetchRange(since),
      fetchRange(prevSince, prevUntil),
    ]);

    return { current: summarize(cur), previous: summarize(prev), days: data.days };
  });

export const getAnalyticsTimeseries = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { days?: number }) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const since = sinceIso(data.days);
    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("ts, event_type")
      .gte("ts", since)
      .in("event_type", ["pageview", "ad_view", "ad_click"])
      .limit(50000);
    if (error) throw new Error(error.message);

    const byDay = new Map<string, { day: string; pageviews: number; ad_view: number; ad_click: number }>();
    for (const r of rows ?? []) {
      const day = (r.ts as string).slice(0, 10);
      let b = byDay.get(day);
      if (!b) { b = { day, pageviews: 0, ad_view: 0, ad_click: 0 }; byDay.set(day, b); }
      if (r.event_type === "pageview") b.pageviews++;
      else if (r.event_type === "ad_view") b.ad_view++;
      else if (r.event_type === "ad_click") b.ad_click++;
    }
    return { series: Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)) };
  });

export const getAnalyticsHeatmap = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { days?: number }) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const since = sinceIso(data.days);
    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("ts")
      .eq("event_type", "pageview")
      .gte("ts", since)
      .limit(50000);
    if (error) throw new Error(error.message);
    // matrix[day 0..6 (Sun..Sat)][hour 0..23]
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of rows ?? []) {
      const d = new Date(r.ts as string);
      matrix[d.getDay()][d.getHours()] += 1;
    }
    return { matrix };
  });

export const getTopRoutes = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { days?: number }) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const since = sinceIso(data.days);
    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("route")
      .eq("event_type", "pageview")
      .not("route", "is", null)
      .gte("ts", since)
      .limit(50000);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of rows ?? []) {
      const k = (r.route as string) ?? "/";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const top = Array.from(counts.entries())
      .map(([route, views]) => ({ route, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);
    return { top };
  });

export const getTopPlacements = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { days?: number }) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const since = sinceIso(data.days);
    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("placement, event_type")
      .not("placement", "is", null)
      .in("event_type", ["ad_view", "ad_click", "ad_render"])
      .gte("ts", since)
      .limit(50000);
    if (error) throw new Error(error.message);
    const map = new Map<string, { placement: string; impressions: number; clicks: number; renders: number }>();
    for (const r of rows ?? []) {
      const k = r.placement as string;
      let b = map.get(k);
      if (!b) { b = { placement: k, impressions: 0, clicks: 0, renders: 0 }; map.set(k, b); }
      if (r.event_type === "ad_view") b.impressions++;
      else if (r.event_type === "ad_click") b.clicks++;
      else if (r.event_type === "ad_render") b.renders++;
    }
    const top = Array.from(map.values())
      .map((p) => ({ ...p, ctr: p.impressions > 0 ? p.clicks / p.impressions : 0 }))
      .sort((a, b) => b.impressions - a.impressions);
    return { top };
  });

export const getAnalyticsFunnel = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { days?: number }) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const since = sinceIso(data.days);
    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("target, anon_id")
      .eq("event_type", "funnel_step")
      .gte("ts", since)
      .limit(50000);
    if (error) throw new Error(error.message);
    const byStep = new Map<string, Set<string>>();
    for (const r of rows ?? []) {
      const step = (r.target as string) ?? "unknown";
      if (!byStep.has(step)) byStep.set(step, new Set());
      if (r.anon_id) byStep.get(step)!.add(r.anon_id as string);
    }
    const steps = Array.from(byStep.entries()).map(([step, users]) => ({ step, users: users.size }));
    return { steps };
  });