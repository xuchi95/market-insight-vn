import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendRecoveryEmailFor } from "@/lib/email/password-recovery.server";

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(200).default(50),
        search: z.string().trim().max(254).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: data.page,
      perPage: data.perPage,
    });
    if (error) throw new Error(error.message);

    let users = list.users;
    if (data.search) {
      const q = data.search.toLowerCase();
      users = users.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          ((u.user_metadata?.full_name as string | undefined) ?? "")
            .toLowerCase()
            .includes(q) ||
          u.id.toLowerCase().includes(q),
      );
    }

    const ids = users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, locale").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
        full_name: profileMap.get(u.id)?.full_name ?? null,
        locale: profileMap.get(u.id)?.locale ?? null,
        roles: roleMap.get(u.id) ?? [],
      })),
      total: list.total ?? users.length,
      page: data.page,
      perPage: data.perPage,
    };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        email: z.string().email().max(254).optional(),
        password: z.string().min(8).max(200).optional(),
        fullName: z.string().trim().max(120).nullable().optional(),
        locale: z.string().trim().max(8).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const updates: Record<string, unknown> = {};
    if (data.email) updates.email = data.email;
    if (data.password) updates.password = data.password;
    if (Object.keys(updates).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, updates);
      if (error) throw new Error(error.message);
    }
    if (data.fullName !== undefined || data.locale !== undefined) {
      const profileUpdate: { full_name?: string | null; locale?: string | null } = {};
      if (data.fullName !== undefined) profileUpdate.full_name = data.fullName;
      if (data.locale !== undefined) profileUpdate.locale = data.locale;
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", data.userId);
      if (error) throw new Error(error.message);
    }
    await logAudit(context.userId, "user.update", "user", data.userId, {
      fields: Object.keys({ ...updates, ...(data.fullName !== undefined ? { fullName: 1 } : {}), ...(data.locale !== undefined ? { locale: 1 } : {}) }),
    });
    return { ok: true };
  });

export const banUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        ban: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Không thể tự cấm chính mình.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ban ? "876000h" : "none",
    } as never);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, data.ban ? "user.ban" : "user.unban", "user", data.userId);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        redirectTo: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await sendRecoveryEmailFor(data.email, data.redirectTo);
    await logAudit(context.userId, "user.password_reset_sent", "email", data.email);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "user"]),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      if (data.userId === context.userId && data.role === "admin") {
        throw new Error("Không thể tự gỡ quyền admin của chính mình.");
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    await logAudit(
      context.userId,
      data.grant ? "user.role_grant" : "user.role_revoke",
      "user",
      data.userId,
      { role: data.role },
    );
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Không thể tự xoá chính mình.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "user.delete", "user", data.userId);
    return { ok: true };
  });