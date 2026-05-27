import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./mailgun.server";
import { welcomeEmail } from "./templates.server";

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.email) return { sent: false, reason: "no_email" };
    if (profile.welcome_email_sent_at) return { sent: false, reason: "already_sent" };
    const { subject, html } = welcomeEmail({ name: profile.full_name });
    await sendEmail({ to: profile.email, subject, html, tags: ["welcome"] });
    await supabaseAdmin.from("profiles").update({ welcome_email_sent_at: new Date().toISOString() }).eq("id", userId);
    return { sent: true };
  });