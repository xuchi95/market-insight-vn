import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Bảng giá ước tính (USD / 1M tokens) cho các model dùng qua Lovable AI Gateway.
 * KHÔNG chính xác tuyệt đối — Lovable có thể có markup riêng. Dùng để theo dõi
 * xu hướng & so sánh tương đối giữa các job, không phải để đối soát hoá đơn.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "google/gemini-2.5-flash-lite": { input: 0.04, output: 0.15 },
  "google/gemini-3-flash-preview": { input: 0.1, output: 0.4 },
  "google/gemini-3.1-flash-lite-preview": { input: 0.04, output: 0.15 },
  "google/gemini-3.5-flash": { input: 0.1, output: 0.4 },
  "google/gemini-3.1-pro-preview": { input: 1.25, output: 10 },
  "openai/gpt-5": { input: 1.25, output: 10 },
  "openai/gpt-5-mini": { input: 0.25, output: 2 },
  "openai/gpt-5-nano": { input: 0.05, output: 0.4 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4o": { input: 2.5, output: 10 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = PRICING[model] ?? { input: 1, output: 4 }; // fallback an toàn cao hơn 1 chút
  const cost = (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export interface LogAiCallArgs {
  source: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  status?: "ok" | "error";
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Fire-and-forget — không bao giờ throw để không phá flow gọi AI. */
export function logAiCall(args: LogAiCallArgs): void {
  const prompt = args.promptTokens ?? 0;
  const completion = args.completionTokens ?? 0;
  const total = args.totalTokens ?? prompt + completion;
  const cost = estimateCostUsd(args.model, prompt, completion);
  void supabaseAdmin
    .from("ai_call_log")
    .insert({
      source: args.source,
      model: args.model,
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: total,
      estimated_cost_usd: cost,
      status: args.status ?? "ok",
      error_message: args.errorMessage ?? null,
      duration_ms: args.durationMs ?? null,
      metadata: (args.metadata ?? null) as never,
    })
    .then(() => undefined, () => undefined);
}