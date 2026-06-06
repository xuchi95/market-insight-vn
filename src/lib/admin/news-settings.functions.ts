import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Quản trị cấu hình nguồn tin tiền điện tử (CoinMarketCap on/off + trạng thái secret).
 */

export const getNewsSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("app_news_settings")
      .select("cmc_enabled, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const key = process.env.CMC_API_KEY || process.env.COINMARKETCAP_API_KEY || "";
    return {
      cmc_enabled: data?.cmc_enabled ?? true,
      updated_at: data?.updated_at ?? null,
      cmc_key_present: key.length > 0,
      cmc_key_preview: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : null,
    };
  });

export const updateNewsSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ cmc_enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("app_news_settings").upsert({
      id: 1,
      cmc_enabled: data.cmc_enabled,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "news_settings.update", "app_news_settings", "1", {
      cmc_enabled: data.cmc_enabled,
    });
    return { ok: true };
  });