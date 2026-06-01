import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Quản trị cấu hình hệ thống email (email_send_state) và danh sách suppression.
 */

export const getSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: state, error } = await supabaseAdmin
      .from("email_send_state")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: suppressed, error: supErr } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id, email, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (supErr) throw new Error(supErr.message);

    return {
      state: state ?? null,
      suppressed: suppressed ?? [],
    };
  });

const StateSchema = z.object({
  batch_size: z.number().int().min(1).max(200),
  send_delay_ms: z.number().int().min(0).max(60_000),
  auth_email_ttl_minutes: z.number().int().min(1).max(1440),
  transactional_email_ttl_minutes: z.number().int().min(1).max(1440),
  retry_after_until: z.string().datetime().nullable().optional(),
});

export const updateSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => StateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("email_send_state")
      .upsert({
        id: 1,
        batch_size: data.batch_size,
        send_delay_ms: data.send_delay_ms,
        auth_email_ttl_minutes: data.auth_email_ttl_minutes,
        transactional_email_ttl_minutes: data.transactional_email_ttl_minutes,
        retry_after_until: data.retry_after_until ?? null,
      });
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "settings.update", "email_send_state", "1");
    return { ok: true };
  });

export const addSuppressedEmail = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(254),
        reason: z.string().min(1).max(200).default("manual"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("suppressed_emails")
      .insert({ email: data.email.toLowerCase(), reason: data.reason });
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "suppression.add", "email", data.email, { reason: data.reason });
    return { ok: true };
  });

export const removeSuppressedEmail = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Lấy email trước khi xoá để ghi audit (vì service_role mới được xoá)
    const { data: row } = await supabaseAdmin
      .from("suppressed_emails")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("suppressed_emails").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "suppression.remove", "email", row?.email ?? data.id);
    return { ok: true };
  });

export const recentAuditLog = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id, admin_id, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  });