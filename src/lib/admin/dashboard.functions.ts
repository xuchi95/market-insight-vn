import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./middleware.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const now = Date.now();
    const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

    const usersList = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const totalUsers = (usersList.data as { total?: number }).total ?? 0;

    const [
      { count: subsActive },
      { count: subsUnsub },
      { count: contactUnread },
      { count: contactTotal },
      { count: popupsActive },
      { count: emailSent24h },
      { count: emailFailed24h },
      { count: emailDlq7d },
      { count: broadcastsTotal },
      { count: subs7d },
      recentContacts,
      recentBroadcasts,
      emailSeries,
      fuelSnap,
    ] = await Promise.all([
      supabaseAdmin.from("newsletter_subscribers").select("*", { count: "exact", head: true }).is("unsubscribed_at", null),
      supabaseAdmin.from("newsletter_subscribers").select("*", { count: "exact", head: true }).not("unsubscribed_at", "is", null),
      supabaseAdmin.from("contact_submissions").select("*", { count: "exact", head: true }).is("read_at", null),
      supabaseAdmin.from("contact_submissions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("admin_popups").select("*", { count: "exact", head: true }).eq("enabled", true),
      supabaseAdmin.from("email_send_log").select("*", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since24h),
      supabaseAdmin.from("email_send_log").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since24h),
      supabaseAdmin.from("email_send_log").select("*", { count: "exact", head: true }).eq("status", "dlq").gte("created_at", since7d),
      supabaseAdmin.from("admin_broadcasts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("newsletter_subscribers").select("*", { count: "exact", head: true }).gte("created_at", since7d),
      supabaseAdmin.from("contact_submissions").select("id,name,email,subject,read_at,created_at").order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("admin_broadcasts").select("id,subject,status,sent_count,created_at").order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("email_send_log").select("status,created_at").gte("created_at", since7d).limit(5000),
      supabaseAdmin.from("vn_fuel_prices_snapshot").select("effective_at,fetched_at").order("effective_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    // Build 7-day series buckets
    const days: { date: string; sent: number; failed: number }[] = [];
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 3600 * 1000);
      days.push({ date: dayKey(d), sent: 0, failed: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const row of (emailSeries.data ?? []) as { status: string; created_at: string }[]) {
      const k = row.created_at.slice(0, 10);
      const i = idx.get(k);
      if (i == null) continue;
      if (row.status === "sent") days[i].sent++;
      else if (row.status === "failed" || row.status === "dlq" || row.status === "bounced") days[i].failed++;
    }

    return {
      users: { total: totalUsers },
      newsletter: { active: subsActive ?? 0, unsubscribed: subsUnsub ?? 0, new7d: subs7d ?? 0 },
      contact: { unread: contactUnread ?? 0, total: contactTotal ?? 0 },
      popups: { active: popupsActive ?? 0 },
      emails: { sent24h: emailSent24h ?? 0, failed24h: emailFailed24h ?? 0, dlq7d: emailDlq7d ?? 0 },
      broadcasts: { total: broadcastsTotal ?? 0 },
      recentContacts: (recentContacts.data ?? []) as Array<{ id: string; name: string | null; email: string; subject: string | null; read_at: string | null; created_at: string }>,
      recentBroadcasts: (recentBroadcasts.data ?? []) as Array<{ id: string; subject: string; status: string; sent_count: number | null; created_at: string }>,
      emailSeries: days,
      fuel: fuelSnap.data as { effective_at: string; fetched_at: string } | null,
    };
  });