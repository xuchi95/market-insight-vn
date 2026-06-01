import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const consumeWatchUnsubToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(8).max(128) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("watchlist_alert_unsubscribe_tokens")
      .select("token,user_id,symbol,used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, reason: "not_found" as const };
    if (row.used_at) return { ok: true as const, alreadyUsed: true, scope: row.symbol ? "item" : "all", symbol: row.symbol };

    if (row.symbol) {
      await supabaseAdmin
        .from("watchlist_items")
        .update({ email_alerts_enabled: false })
        .eq("user_id", row.user_id)
        .eq("symbol", row.symbol);
    } else {
      await supabaseAdmin
        .from("profiles")
        .update({ watchlist_alerts_global_enabled: false })
        .eq("id", row.user_id);
    }
    await supabaseAdmin
      .from("watchlist_alert_unsubscribe_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", data.token);

    return {
      ok: true as const,
      alreadyUsed: false,
      scope: row.symbol ? ("item" as const) : ("all" as const),
      symbol: row.symbol,
    };
  });