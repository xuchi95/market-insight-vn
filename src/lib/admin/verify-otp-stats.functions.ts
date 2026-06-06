import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  days: z.number().int().min(1).max(90).default(14),
});

type Row = {
  status: string;
  template_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
};

export const getVerifyOtpStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((i) => Input.parse(i ?? {}))
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - data.days * 24 * 3600 * 1000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("email_send_log")
      .select("status,template_name,created_at,metadata,error_message")
      .like("template_name", "%_verify")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as Row[];

    // Aggregate by day
    const dayMap = new Map<string, { date: string; success: number; failed: number }>();
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const k = dayKey(d);
      dayMap.set(k, { date: k, success: 0, failed: 0 });
    }

    // Aggregate by otp_type
    const typeMap = new Map<string, { otp_type: string; success: number; failed: number }>();
    const errorMap = new Map<string, number>();

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const r of list) {
      const isSuccess = r.status === "delivered" || r.status === "success" || r.status === "sent";
      const isFailed = r.status === "failed" || r.status === "dlq" || r.status === "bounced";
      if (!isSuccess && !isFailed) continue;

      const k = r.created_at.slice(0, 10);
      const day = dayMap.get(k);
      if (day) {
        if (isSuccess) day.success++;
        else day.failed++;
      }

      const meta = r.metadata ?? {};
      const otpType =
        (meta["otp_type"] as string | undefined) ??
        r.template_name.replace(/_verify$/, "") ??
        "unknown";
      const t = typeMap.get(otpType) ?? { otp_type: otpType, success: 0, failed: 0 };
      if (isSuccess) t.success++;
      else t.failed++;
      typeMap.set(otpType, t);

      if (isSuccess) totalSuccess++;
      else {
        totalFailed++;
        const msg = (r.error_message ?? "unknown").slice(0, 120);
        errorMap.set(msg, (errorMap.get(msg) ?? 0) + 1);
      }
    }

    const byDay = Array.from(dayMap.values());
    const byType = Array.from(typeMap.values()).sort(
      (a, b) => b.success + b.failed - (a.success + a.failed),
    );
    const topErrors = Array.from(errorMap.entries())
      .map(([error_message, count]) => ({ error_message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const total = totalSuccess + totalFailed;
    const failRate = total > 0 ? totalFailed / total : 0;

    return {
      totals: { total, success: totalSuccess, failed: totalFailed, failRate },
      byDay,
      byType,
      topErrors,
      days: data.days,
    };
  });