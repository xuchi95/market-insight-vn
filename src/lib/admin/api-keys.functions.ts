import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey } from "@/lib/api-keys.server";

const SCOPES = ["gold", "crypto", "fuel", "stocks"] as const;

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_prefix, owner_email, scopes, active, request_count, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        owner_email: z.string().trim().email().max(255).optional().nullable(),
        scopes: z.array(z.enum(SCOPES)).min(1).max(SCOPES.length),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { key, prefix, hash } = await generateApiKey();
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        name: data.name,
        owner_email: data.owner_email ?? null,
        scopes: data.scopes,
        key_prefix: prefix,
        key_hash: hash,
        created_by: (context as { userId: string }).userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit((context as { userId: string }).userId, "api_key.create", "api_key", row.id, {
      name: data.name,
    });
    // Trả KEY ĐẦY ĐỦ 1 lần duy nhất — admin phải copy ngay.
    return { id: row.id, key };
  });

export const toggleApiKey = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit((context as { userId: string }).userId, "api_key.toggle", "api_key", data.id, {
      active: data.active,
    });
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit((context as { userId: string }).userId, "api_key.delete", "api_key", data.id);
    return { ok: true };
  });