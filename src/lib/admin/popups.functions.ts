import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PopupFieldSchema = z.object({
  name: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  type: z.enum(["email", "text", "select"]),
  required: z.boolean().default(true),
  placeholder: z.string().max(120).optional(),
  options: z.array(z.string().max(60)).optional(),
});

const ThemeSchema = z.object({
  accent: z.enum(["gold", "primary", "down", "up"]).default("gold"),
  layout: z.enum(["center", "bottom", "side"]).default("center"),
  animation: z.enum(["fade", "slide", "pop"]).default("fade"),
  icon: z.string().max(30).optional(),
});

const TargetingSchema = z.object({
  pages: z.array(z.string().max(200)).default(["*"]),
  delaySeconds: z.number().int().min(0).max(600).default(25),
  scrollPercent: z.number().int().min(0).max(100).default(0),
  frequencyDays: z.number().int().min(0).max(365).default(1),
  hideForSubscribers: z.boolean().default(true),
  authDelaySeconds: z.number().int().min(0).max(3600).optional(),
  authFrequencyDays: z.number().int().min(0).max(365).optional(),
});

const PopupUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/i),
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(240).nullable().optional(),
  body_md: z.string().max(2000).nullable().optional(),
  cta_label: z.string().trim().min(1).max(60),
  success_message: z.string().trim().min(1).max(240),
  theme: ThemeSchema,
  fields: z.array(PopupFieldSchema).min(1).max(8),
  targeting: TargetingSchema,
  topics: z.array(z.string().max(30)).max(20),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
});

export const listPopups = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("admin_popups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { popups: data ?? [] };
  });

export const upsertPopup = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => PopupUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      slug: data.slug,
      enabled: data.enabled,
      title: data.title,
      subtitle: data.subtitle ?? null,
      body_md: data.body_md ?? null,
      cta_label: data.cta_label,
      success_message: data.success_message,
      theme: data.theme as never,
      fields: data.fields as never,
      targeting: data.targeting as never,
      topics: data.topics,
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("admin_popups").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit(context.userId, "popup.update", "popup", data.id);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("admin_popups")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "popup.create", "popup", row.id);
    return { ok: true, id: row.id };
  });

export const deletePopup = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("admin_popups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "popup.delete", "popup", data.id);
    return { ok: true };
  });

export const togglePopup = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("admin_popups")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "popup.toggle", "popup", data.id, { enabled: data.enabled });
    return { ok: true };
  });

/** Public — fetch active popups for the current visitor (no auth required). */
export const getActivePopups = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("admin_popups")
    .select(
      "id, slug, title, subtitle, body_md, cta_label, success_message, theme, fields, targeting, topics",
    )
    .eq("enabled", true)
    .or("starts_at.is.null,starts_at.lte." + new Date().toISOString())
    .or("ends_at.is.null,ends_at.gte." + new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { popups: data ?? [] };
});