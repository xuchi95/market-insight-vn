import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const now = Date.now();
    const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

    const usersList = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const totalUsers = usersList.data.total ?? 0;

    const [
      { count: subsActive },
      { count: subsUnsub },
      { count: contactUnread },
      { count: contactTotal },
      { count: popupsActive },
      { count: emailSent24h },
      { count: emailFailed24h },
      { count: emailDlq7d },
    ] = await Promise.all([
      supabaseAdmin.from("newsletter_subscribers").select("*", { count: "exact", head: true }).is("unsubscribed_at", null),
      supabaseAdmin.from("newsletter_subscribers").select("*", { count: "exact", head: true }).not("unsubscribed_at", "is", null),
      supabaseAdmin.from("contact_submissions").select("*", { count: "exact", head: true }).is("read_at", null),
      supabaseAdmin.from("contact_submissions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("admin_popups").select("*", { count: "exact", head: true }).eq("enabled", true),
      supabaseAdmin.from("email_send_log").select("*", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since24h),
      supabaseAdmin.from("email_send_log").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since24h),
      supabaseAdmin.from("email_send_log").select("*", { count: "exact", head: true }).eq("status", "dlq").gte("created_at", since7d),
    ]);

    return {
      users: { total: totalUsers },
      newsletter: { active: subsActive ?? 0, unsubscribed: subsUnsub ?? 0 },
      contact: { unread: contactUnread ?? 0, total: contactTotal ?? 0 },
      popups: { active: popupsActive ?? 0 },
      emails: { sent24h: emailSent24h ?? 0, failed24h: emailFailed24h ?? 0, dlq7d: emailDlq7d ?? 0 },
    };
  });