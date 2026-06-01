import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, logAudit } from "./middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Newsletter inbox */
export const listSubscribers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["all", "active", "unsubscribed"]).default("active"),
        search: z.string().trim().max(254).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, topics, source, created_at, confirmed_at, unsubscribed_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status === "active") q = q.is("unsubscribed_at", null);
    else if (data.status === "unsubscribed") q = q.not("unsubscribed_at", "is", null);
    if (data.search) q = q.ilike("email", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { subscribers: rows ?? [] };
  });

export const unsubscribeSubscriber = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), unsubscribe: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: data.unsubscribe ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, data.unsubscribe ? "newsletter.unsubscribe" : "newsletter.resubscribe", "subscriber", data.id);
    return { ok: true };
  });

export const deleteSubscriber = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("newsletter_subscribers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "newsletter.delete", "subscriber", data.id);
    return { ok: true };
  });

/** Contact inbox */
export const listContactSubmissions = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["all", "unread", "read"]).default("all"),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status === "unread") q = q.is("read_at", null);
    else if (data.status === "read") q = q.not("read_at", "is", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { submissions: rows ?? [] };
  });

export const markContactRead = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), read: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("contact_submissions")
      .update({ read_at: data.read ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("contact_submissions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "contact.delete", "contact", data.id);
    return { ok: true };
  });