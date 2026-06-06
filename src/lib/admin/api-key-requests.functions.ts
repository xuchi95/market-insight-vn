import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey } from "@/lib/api-keys.server";
import {
  sendApiKeyApprovedEmail,
  sendApiKeyRejectedEmail,
} from "@/lib/email/api-key-request-emails.server";

const SCOPES = ["gold", "crypto", "fuel", "stocks"] as const;

export const listApiKeyRequests = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("api_key_requests")
      .select(
        "id, full_name, email, company, website, project_name, project_description, use_case, expected_monthly_requests, scopes, integration_type, status, admin_notes, rejection_reason, api_key_id, reviewed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const approveApiKeyRequest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        scopes: z.array(z.enum(SCOPES)).min(1).max(SCOPES.length).optional(),
        admin_notes: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = (context as { userId: string }).userId;
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("api_key_requests")
      .select("id, full_name, email, project_name, scopes, status")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Không tìm thấy yêu cầu.");
    if (req.status !== "pending") throw new Error("Yêu cầu đã được xử lý trước đó.");

    const finalScopes =
      data.scopes && data.scopes.length > 0
        ? data.scopes
        : ((req.scopes as string[]) ?? []).filter((s): s is (typeof SCOPES)[number] =>
            (SCOPES as readonly string[]).includes(s),
          );
    if (finalScopes.length === 0) throw new Error("Cần chọn ít nhất một quyền truy cập.");

    // Sinh key + lưu vào bảng api_keys.
    const { key, prefix, hash } = await generateApiKey();
    const { data: keyRow, error: keyErr } = await supabaseAdmin
      .from("api_keys")
      .insert({
        name: `${req.project_name} (${req.email})`,
        owner_email: req.email,
        scopes: finalScopes,
        key_prefix: prefix,
        key_hash: hash,
        created_by: userId,
      })
      .select("id")
      .single();
    if (keyErr) throw new Error(keyErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("api_key_requests")
      .update({
        status: "approved",
        admin_notes: data.admin_notes ?? null,
        api_key_id: keyRow.id,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (updErr) throw new Error(updErr.message);

    await logAudit(userId, "api_key_request.approve", "api_key_request", req.id, {
      api_key_id: keyRow.id,
      scopes: finalScopes,
    });

    try {
      await sendApiKeyApprovedEmail({
        to: req.email as string,
        fullName: req.full_name as string,
        projectName: req.project_name as string,
        apiKey: key,
        scopes: finalScopes,
        adminNotes: data.admin_notes ?? null,
      });
    } catch (e) {
      console.error("[api-key-request] approval email failed", e);
    }
    return { ok: true };
  });

export const rejectApiKeyRequest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        rejection_reason: z.string().trim().min(1).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = (context as { userId: string }).userId;
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("api_key_requests")
      .select("id, full_name, email, project_name, status")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Không tìm thấy yêu cầu.");
    if (req.status !== "pending") throw new Error("Yêu cầu đã được xử lý trước đó.");

    const { error: updErr } = await supabaseAdmin
      .from("api_key_requests")
      .update({
        status: "rejected",
        rejection_reason: data.rejection_reason,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (updErr) throw new Error(updErr.message);

    await logAudit(userId, "api_key_request.reject", "api_key_request", req.id, {
      reason: data.rejection_reason,
    });

    try {
      await sendApiKeyRejectedEmail({
        to: req.email as string,
        fullName: req.full_name as string,
        projectName: req.project_name as string,
        reason: data.rejection_reason,
      });
    } catch (e) {
      console.error("[api-key-request] rejection email failed", e);
    }
    return { ok: true };
  });

export const deleteApiKeyRequest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId: string }).userId;
    const { error } = await supabaseAdmin
      .from("api_key_requests")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(userId, "api_key_request.delete", "api_key_request", data.id);
    return { ok: true };
  });