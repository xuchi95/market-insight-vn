import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin/middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AiUsageRollup {
  source: string;
  model: string;
  calls: number;
  errors: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiUsageRecent {
  id: number;
  createdAt: string;
  source: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface AiUsagePayload {
  fetchedAt: string;
  windows: {
    last7d: { calls: number; errors: number; cost: number };
    prev7d: { calls: number; errors: number; cost: number };
    last30d: { calls: number; errors: number; cost: number };
    today: { calls: number; errors: number; cost: number };
  };
  bySourceModel: AiUsageRollup[];
  daily: Array<{ date: string; calls: number; errors: number; cost: number }>;
  recent: AiUsageRecent[];
}

function emptyAgg() {
  return { calls: 0, errors: 0, cost: 0 };
}

export const getAiUsage = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AiUsagePayload> => {
    const now = new Date();
    const ms = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const since30 = ms(30).toISOString();

    // Lấy 30 ngày để rollup; recent lấy riêng 50 dòng mới nhất.
    const [{ data: rows, error }, { data: recentRows }] = await Promise.all([
      supabaseAdmin
        .from("ai_call_log")
        .select("created_at, source, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, status")
        .gte("created_at", since30)
        .order("created_at", { ascending: false })
        .limit(20000),
      supabaseAdmin
        .from("ai_call_log")
        .select("id, created_at, source, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, status, error_message, duration_ms")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (error) throw new Error("Không đọc được ai_call_log: " + error.message);

    const last7Cut = ms(7).getTime();
    const prev7Lo = ms(14).getTime();
    const prev7Hi = last7Cut;
    const todayCut = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const w = {
      last7d: emptyAgg(),
      prev7d: emptyAgg(),
      last30d: emptyAgg(),
      today: emptyAgg(),
    };
    const bySrcModel = new Map<string, AiUsageRollup>();
    const daily = new Map<string, { calls: number; errors: number; cost: number }>();

    for (const r of rows ?? []) {
      const t = new Date(r.created_at as string).getTime();
      const cost = Number(r.estimated_cost_usd) || 0;
      const tokens = Number(r.total_tokens) || 0;
      const isErr = String(r.status) !== "ok";

      w.last30d.calls++;
      w.last30d.cost += cost;
      if (isErr) w.last30d.errors++;
      if (t >= last7Cut) {
        w.last7d.calls++;
        w.last7d.cost += cost;
        if (isErr) w.last7d.errors++;
      } else if (t >= prev7Lo && t < prev7Hi) {
        w.prev7d.calls++;
        w.prev7d.cost += cost;
        if (isErr) w.prev7d.errors++;
      }
      if (t >= todayCut) {
        w.today.calls++;
        w.today.cost += cost;
        if (isErr) w.today.errors++;
      }

      const key = `${r.source}|${r.model}`;
      const cur = bySrcModel.get(key) ?? {
        source: String(r.source),
        model: String(r.model),
        calls: 0,
        errors: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      };
      cur.calls++;
      cur.totalTokens += tokens;
      cur.estimatedCostUsd += cost;
      if (isErr) cur.errors++;
      bySrcModel.set(key, cur);

      const d = new Date(t);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dcur = daily.get(day) ?? emptyAgg();
      dcur.calls++;
      dcur.cost += cost;
      if (isErr) dcur.errors++;
      daily.set(day, dcur);
    }

    // Round cost cho gọn UI
    const roundCost = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
    (Object.keys(w) as Array<keyof typeof w>).forEach((k) => { w[k].cost = roundCost(w[k].cost); });

    const bySourceModel = Array.from(bySrcModel.values())
      .map((r) => ({ ...r, estimatedCostUsd: roundCost(r.estimatedCostUsd) }))
      .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd || b.calls - a.calls);

    // Lấp đủ 30 ngày để UI vẽ liền mạch
    const dailyOut: AiUsagePayload["daily"] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const v = daily.get(key) ?? emptyAgg();
      dailyOut.push({ date: key, calls: v.calls, errors: v.errors, cost: roundCost(v.cost) });
    }

    const recent: AiUsageRecent[] = (recentRows ?? []).map((r) => ({
      id: Number(r.id),
      createdAt: String(r.created_at),
      source: String(r.source),
      model: String(r.model),
      promptTokens: Number(r.prompt_tokens) || 0,
      completionTokens: Number(r.completion_tokens) || 0,
      totalTokens: Number(r.total_tokens) || 0,
      estimatedCostUsd: Number(r.estimated_cost_usd) || 0,
      status: String(r.status),
      errorMessage: (r.error_message as string | null) ?? null,
      durationMs: (r.duration_ms as number | null) ?? null,
    }));

    return {
      fetchedAt: now.toISOString(),
      windows: w,
      bySourceModel,
      daily: dailyOut,
      recent,
    };
  });