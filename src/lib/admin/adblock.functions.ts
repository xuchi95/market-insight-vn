import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const HexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "Màu phải dạng hex");

const SettingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["soft", "hard", "dismiss"]),
  layout: z.enum(["modal", "banner_top", "banner_bottom", "fullscreen", "corner"]),
  theme: z.enum(["dark", "light", "gold", "custom"]),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  secondary_message: z.string().max(500).default(""),
  button_text: z.string().trim().min(1).max(80),
  dismiss_text: z.string().max(80).default(""),
  allow_dismiss: z.boolean(),
  show_retry: z.boolean(),
  show_logo: z.boolean(),
  bg_color: HexColor,
  text_color: HexColor,
  accent_color: HexColor,
  overlay_color: HexColor,
  overlay_opacity: z.number().min(0).max(1),
  backdrop_blur: z.number().int().min(0).max(40),
  border_radius: z.number().int().min(0).max(48),
  detection_bait: z.boolean(),
  detection_fetch: z.boolean(),
  detection_script: z.boolean(),
  recheck_interval_sec: z.number().int().min(0).max(3600),
  dismiss_cooldown_hours: z.number().int().min(0).max(720),
  whitelist_paths: z.array(z.string().max(200)).max(50),
  whitelist_roles: z.array(z.string().max(40)).max(20),
});

export type AdblockSettings = z.infer<typeof SettingsSchema>;

/** Public — bất kỳ ai cũng đọc được config để render guard.
 *  Trả null nếu disabled để client bỏ qua hoàn toàn (không render bait). */
export const getAdblockSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ settings: AdblockSettings | null }> => {
    const { data, error } = await supabaseAdmin
      .from("adblock_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error || !data) return { settings: null };
    if (!data.enabled) return { settings: null };
    return { settings: data as unknown as AdblockSettings };
  },
);

/** Admin — đọc full config (kể cả khi disabled) để hiển thị form. */
export const adminGetAdblockSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ settings: AdblockSettings }> => {
    const { data, error } = await supabaseAdmin
      .from("adblock_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Chưa khởi tạo cấu hình adblock");
    return { settings: data as unknown as AdblockSettings };
  });

export const updateAdblockSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => SettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("adblock_settings")
      .update(data)
      .eq("id", true);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "adblock_settings.update", "adblock_settings", "singleton");
    return { ok: true };
  });