import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Lấy cấu hình tính % thay đổi giá. */
export const getPriceChangeSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("price_change_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { settings: data };
  });

const SettingsSchema = z.object({
  enabled: z.boolean(),
  window_tolerance_hours: z.number().min(0).max(12),
  min_sample_age_hours: z.number().min(0).max(24),
  min_samples: z.number().int().min(1).max(100),
  snapshot_min_interval_minutes: z.number().int().min(1).max(1440),
});

export const updatePriceChangeSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => SettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("price_change_settings")
      .upsert({ id: 1, ...data });
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "price_settings.update", "price_change_settings", "1", data);
    return { ok: true };
  });