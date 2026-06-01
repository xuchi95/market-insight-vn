import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const updateSchema = z.object({
  symbol: z.string().min(1).max(64),
  emailEnabled: z.boolean(),
  thresholdPct: z.number().min(1).max(50),
});

export const updateWatchAlertPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("watchlist_items")
      .update({
        email_alerts_enabled: data.emailEnabled,
        alert_threshold_pct: data.thresholdPct,
      })
      .eq("user_id", userId)
      .eq("symbol", data.symbol);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setGlobalWatchAlertsEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ watchlist_alerts_global_enabled: data.enabled })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyWatchAlertPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [items, profile] = await Promise.all([
      supabase
        .from("watchlist_items")
        .select("symbol,label,category,to_path,email_alerts_enabled,alert_threshold_pct,last_alert_sent_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("watchlist_alerts_global_enabled")
        .eq("id", userId)
        .single(),
    ]);
    if (items.error) throw new Error(items.error.message);
    return {
      items: items.data ?? [],
      globalEnabled: profile.data?.watchlist_alerts_global_enabled ?? true,
    };
  });