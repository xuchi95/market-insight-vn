import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Audience = "all_users" | "newsletter" | "admins" | "custom_emails";

async function resolveRecipients(
  audience: Audience,
  customEmails: string[],
  topicsFilter: string[],
): Promise<string[]> {
  const emails = new Set<string>();

  if (audience === "custom_emails") {
    customEmails.forEach((e) => emails.add(e.toLowerCase()));
  } else if (audience === "newsletter") {
    let q = supabaseAdmin
      .from("newsletter_subscribers")
      .select("email, topics")
      .is("unsubscribed_at", null);
    if (topicsFilter.length) q = q.overlaps("topics", topicsFilter);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    (data ?? []).forEach((r) => emails.add((r.email as string).toLowerCase()));
  } else if (audience === "all_users" || audience === "admins") {
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      let users = data.users;
      if (audience === "admins") {
        const ids = users.map((u) => u.id);
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("user_id", ids)
          .eq("role", "admin");
        const adminIds = new Set((roles ?? []).map((r) => r.user_id));
        users = users.filter((u) => adminIds.has(u.id));
      }
      users.forEach((u) => u.email && emails.add(u.email.toLowerCase()));
      if (users.length < 200) break;
      page += 1;
      if (page > 50) break; // safety cap = 10,000
    }
  }

  if (emails.size === 0) return [];
  // Suppression filter
  const list = Array.from(emails);
  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails")
    .select("email")
    .in("email", list);
  const blocked = new Set((suppressed ?? []).map((r) => (r.email as string).toLowerCase()));
  return list.filter((e) => !blocked.has(e));
}

function mdToHtml(md: string): string {
  // Minimal escape + line break + bold/italic + links — đủ dùng cho admin broadcast.
  const esc = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" style="color:#b8860b">$1</a>')
    .replace(/\n{2,}/g, "</p><p style=\"margin:0 0 16px;font-size:14px;line-height:1.6;color:#222\">")
    .replace(/\n/g, "<br/>");
}

function renderBroadcastEmail(subject: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="background:#ffffff;font-family:Arial,sans-serif;margin:0;padding:0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
          <tr><td style="padding:0 24px 16px;border-bottom:1px solid #eee">
            <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#b8860b">MarketWatch</div>
            <h1 style="font-size:22px;margin:10px 0 0;color:#111">${subject.replace(/</g, "&lt;")}</h1>
          </td></tr>
          <tr><td style="padding:24px">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#222">${bodyHtml}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

const BroadcastUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  subject: z.string().trim().min(1).max(200),
  body_md: z.string().trim().min(1).max(20000),
  audience: z.enum(["all_users", "newsletter", "admins", "custom_emails"]),
  custom_emails: z.array(z.string().email()).max(5000).default([]),
  topics_filter: z.array(z.string().max(30)).max(20).default([]),
});

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("admin_broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { broadcasts: data ?? [] };
  });

export const saveBroadcastDraft = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => BroadcastUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      subject: data.subject,
      body_md: data.body_md,
      audience: data.audience,
      custom_emails: data.custom_emails,
      topics_filter: data.topics_filter,
      status: "draft" as const,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("admin_broadcasts").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("admin_broadcasts")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const previewRecipients = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        audience: z.enum(["all_users", "newsletter", "admins", "custom_emails"]),
        custom_emails: z.array(z.string().email()).max(5000).default([]),
        topics_filter: z.array(z.string().max(30)).max(20).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const recipients = await resolveRecipients(data.audience, data.custom_emails, data.topics_filter);
    return { count: recipients.length, sample: recipients.slice(0, 10) };
  });

export const sendTestBroadcast = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        subject: z.string().min(1).max(200),
        body_md: z.string().min(1).max(20000),
        toEmail: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const html = renderBroadcastEmail(data.subject, mdToHtml(data.body_md));
    const { error } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: data.toEmail,
        subject: "[Test] " + data.subject,
        html,
        template_name: "admin_broadcast_test",
        metadata: { test: true, requested_by: context.userId },
      } as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: loadErr } = await supabaseAdmin
      .from("admin_broadcasts")
      .select("*")
      .eq("id", data.id)
      .single();
    if (loadErr || !row) throw new Error("Không tìm thấy broadcast.");
    if (row.status !== "draft") throw new Error("Broadcast đã được gửi hoặc đang gửi.");

    const recipients = await resolveRecipients(
      row.audience as Audience,
      (row.custom_emails as string[]) ?? [],
      (row.topics_filter as string[]) ?? [],
    );

    if (!recipients.length) throw new Error("Không có người nhận hợp lệ.");

    await supabaseAdmin
      .from("admin_broadcasts")
      .update({ status: "sending", total_recipients: recipients.length })
      .eq("id", data.id);

    const html = renderBroadcastEmail(row.subject, mdToHtml(row.body_md));
    let sent = 0;
    let failed = 0;
    for (const email of recipients) {
      const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: email,
          subject: row.subject,
          html,
          template_name: "admin_broadcast",
          metadata: { broadcast_id: data.id },
        } as never,
      });
      if (enqErr) failed += 1;
      else sent += 1;
    }

    await supabaseAdmin
      .from("admin_broadcasts")
      .update({
        status: failed === recipients.length ? "failed" : "sent",
        sent_at: new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
      })
      .eq("id", data.id);

    await logAudit(context.userId, "broadcast.send", "broadcast", data.id, {
      total: recipients.length,
      sent,
      failed,
    });
    return { ok: true, total: recipients.length, sent, failed };
  });

export const deleteBroadcast = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("admin_broadcasts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "broadcast.delete", "broadcast", data.id);
    return { ok: true };
  });