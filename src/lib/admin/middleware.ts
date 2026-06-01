import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Composable middleware: yêu cầu user đăng nhập VÀ có role admin.
 * Cung cấp trong context: supabase (user-scoped), userId, claims, supabaseAdmin (bypass RLS).
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { userId } = context as { userId: string };
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error("Không kiểm tra được quyền admin: " + error.message);
    if (!data) throw new Error("Forbidden: yêu cầu quyền admin");
    return next({ context: { isAdmin: true } });
  });

export async function logAudit(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    metadata: (metadata ?? null) as never,
  });
}