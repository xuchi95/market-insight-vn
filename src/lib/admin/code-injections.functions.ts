import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LocationSchema = z.enum(["head", "body_start", "body_end"]);

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Tên không được rỗng").max(120),
  location: LocationSchema,
  code: z.string().max(20000),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(9999).default(0),
  notes: z.string().max(500).nullable().optional(),
});

export const listCodeInjections = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("site_code_injections")
      .select("*")
      .order("location", { ascending: true })
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const upsertCodeInjection = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => UpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      location: data.location,
      code: data.code,
      enabled: data.enabled,
      priority: data.priority,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("site_code_injections")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit(context.userId, "code_injection.update", "site_code_injections", data.id);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("site_code_injections")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "code_injection.create", "site_code_injections", row.id);
    return { id: row.id };
  });

export const deleteCodeInjection = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("site_code_injections")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "code_injection.delete", "site_code_injections", data.id);
    return { ok: true };
  });

export interface PublicInjection {
  location: "head" | "body_start" | "body_end";
  code: string;
}

/** Public — trả về các snippet đang bật để chèn vào HTML. */
export const getActiveCodeInjections = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: PublicInjection[] }> => {
    const { data, error } = await supabaseAdmin
      .from("site_code_injections")
      .select("location, code")
      .eq("enabled", true)
      .order("location", { ascending: true })
      .order("priority", { ascending: true });
    if (error) return { items: [] };
    return {
      items: (data ?? []).map((r) => ({
        location: r.location as PublicInjection["location"],
        code: r.code ?? "",
      })),
    };
  },
);