import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "@/lib/admin/middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import { banAppealDecisionEmail } from "@/lib/email/templates.server";

export interface BanAppealRow {
  id: string;
  user_id: string;
  email: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  decided_at: string | null;
  decided_by: string | null;
  ip: string | null;
  created_at: string;
  updated_at: string;
}

const ListInput = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
  limit: z.number().int().min(1).max(200).default(100),
});

export const listBanAppeals = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { status?: string; limit?: number } | undefined) => ListInput.parse(d ?? {}))
  .handler(async ({ data }): Promise<{ appeals: BanAppealRow[] }> => {
    let q = supabaseAdmin
      .from("ban_appeals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { appeals: (rows ?? []) as BanAppealRow[] };
  });

const DecideInput = z.object({
  appealId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  adminNote: z.string().trim().max(2000).optional().nullable(),
});

export const decideBanAppeal = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => DecideInput.parse(d))
  .handler(async ({ data, context }) => {
    const adminId = (context as { userId: string }).userId;
    const { data: appeal, error: loadErr } = await supabaseAdmin
      .from("ban_appeals")
      .select("*")
      .eq("id", data.appealId)
      .single();
    if (loadErr || !appeal) throw new Error("Không tìm thấy đơn kháng nghị");
    if (appeal.status !== "pending") throw new Error("Đơn này đã được xử lý");

    // If approved, unban the user via Auth admin API.
    if (data.decision === "approved") {
      const { error: unbanErr } = await supabaseAdmin.auth.admin.updateUserById(appeal.user_id, {
        ban_duration: "none",
      } as { ban_duration: string });
      if (unbanErr) throw new Error("Không mở khoá được tài khoản: " + unbanErr.message);
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("ban_appeals")
      .update({
        status: data.decision,
        admin_note: data.adminNote ?? null,
        decided_at: nowIso,
        decided_by: adminId,
      })
      .eq("id", appeal.id)
      .select("*")
      .single();
    if (updateErr) throw new Error(updateErr.message);

    // Send result email (best-effort).
    try {
      const { subject, html } = banAppealDecisionEmail({
        approved: data.decision === "approved",
        email: appeal.email,
        reason: appeal.reason,
        adminNote: data.adminNote ?? null,
        appealId: appeal.id,
        submittedAt: appeal.created_at,
        decidedAt: nowIso,
      });
      await sendEmail({ to: appeal.email, subject, html, tags: ["ban-appeal-decision"] });
    } catch (e) {
      console.error("[decideBanAppeal] email failed", e);
    }

    await logAudit(adminId, "ban_appeal_decide", "ban_appeal", appeal.id, {
      decision: data.decision,
      target_user: appeal.user_id,
    });

    return { appeal: updated as BanAppealRow };
  });