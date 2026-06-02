import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";
import { securityAlertEmail } from "./templates.server";

function summarizeUA(ua: string | null | undefined): string | null {
  if (!ua) return null;
  // Light heuristic so the email shows something readable.
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Trình duyệt";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iOS/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" : "Thiết bị";
  return `${browser} · ${os}`;
}

/**
 * Called right after a successful login. Compares the current IP with the
 * one stored on the profile; if it changed (and alerts are enabled) sends a
 * branded MarketWatch security alert email via Postmark. Always updates
 * last_login_ip / last_login_at so future logins compare against the latest.
 */
export const recordLoginAndAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const ua = getRequestHeader("user-agent") ?? null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, last_login_ip, security_alerts_enabled")
      .eq("id", userId)
      .maybeSingle();

    const now = new Date();
    await supabaseAdmin
      .from("profiles")
      .update({ last_login_ip: ip, last_login_at: now.toISOString() })
      .eq("id", userId);

    if (!profile?.email) return { alerted: false, reason: "no_email" };
    if (profile.security_alerts_enabled === false) return { alerted: false, reason: "disabled" };
    // Only alert on a real IP change (skip first-ever login to avoid noise).
    if (!profile.last_login_ip || profile.last_login_ip === ip) {
      return { alerted: false, reason: "same_ip" };
    }

    const whenLabel = now.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const { subject, html } = securityAlertEmail({
      event: "Phát hiện đăng nhập từ thiết bị / IP mới",
      ip,
      userAgent: summarizeUA(ua),
      whenLabel,
    });
    try {
      await sendEmail({ to: profile.email, subject, html, tags: ["security-alert"] });
      return { alerted: true };
    } catch (e) {
      console.error("security alert send failed", e);
      return { alerted: false, reason: "send_failed" };
    }
  });