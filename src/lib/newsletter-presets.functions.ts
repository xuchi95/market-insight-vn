import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VALID_TOPICS = [
  "gold", "gold-sjc", "btc", "eth", "sol", "bnb", "usd", "eur",
] as const;
const TopicSchema = z.enum(VALID_TOPICS);

const MAX_PRESETS = 20;

const NameSchema = z.string().trim().min(1).max(60);
const TopicsSchema = z.array(TopicSchema).min(1).max(VALID_TOPICS.length);

export const listMyPresets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("newsletter_topic_presets")
      .select("id, name, topics, is_default, created_at, updated_at")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { presets: data ?? [], max: MAX_PRESETS };
  });

export const createPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: NameSchema,
      topics: TopicsSchema,
      makeDefault: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("newsletter_topic_presets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) >= MAX_PRESETS) {
      throw new Error(`Đã đạt giới hạn ${MAX_PRESETS} bộ preset.`);
    }
    if (data.makeDefault) {
      await supabaseAdmin
        .from("newsletter_topic_presets")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);
    }
    const { data: row, error } = await supabaseAdmin
      .from("newsletter_topic_presets")
      .insert({
        user_id: userId,
        name: data.name,
        topics: data.topics,
        is_default: !!data.makeDefault,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const updatePreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: NameSchema.optional(),
      topics: TopicsSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { name?: string; topics?: string[] } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.topics !== undefined) patch.topics = data.topics;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("newsletter_topic_presets")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("newsletter_topic_presets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDefaultPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Clear current default
    await supabaseAdmin
      .from("newsletter_topic_presets")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("newsletter_topic_presets")
        .update({ is_default: true })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });