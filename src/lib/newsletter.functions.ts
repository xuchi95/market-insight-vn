import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/mailgun.server";
import { newsletterConfirmEmail } from "@/lib/email/templates.server";

const EmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const getMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    const { data: subs, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, source, confirmed_at, unsubscribed_at, created_at")
      .eq("email", profile?.email ?? "__none__")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);

    return {
      accountEmail: profile?.email ?? null,
      subscriptions: subs ?? [],
    };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EmailSchema.parse(input))
  .handler(async ({ data }) => {
    const { email } = data;
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .upsert(
        { email, source: "settings", unsubscribed_at: null, confirmed_at: new Date().toISOString() },
        { onConflict: "email" },
      );
    if (error) throw new Error(error.message);
    try {
      const { subject, html } = newsletterConfirmEmail({ email });
      await sendEmail({ to: email, subject, html, tags: ["newsletter-confirm"] });
    } catch (e) {
      console.error("newsletter email failed", e);
    }
    return { ok: true };
  });

export const unsubscribeNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EmailSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", data.email);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeNewsletterEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      oldEmail: z.string().trim().toLowerCase().email().max(254),
      newEmail: z.string().trim().toLowerCase().email().max(254),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.oldEmail === data.newEmail) return { ok: true };
    const { error: upErr } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", data.oldEmail);
    if (upErr) throw new Error(upErr.message);
    const { error: insErr } = await supabaseAdmin
      .from("newsletter_subscribers")
      .upsert(
        {
          email: data.newEmail,
          source: "settings-change",
          unsubscribed_at: null,
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    if (insErr) throw new Error(insErr.message);
    try {
      const { subject, html } = newsletterConfirmEmail({ email: data.newEmail });
      await sendEmail({ to: data.newEmail, subject, html, tags: ["newsletter-confirm"] });
    } catch (e) {
      console.error("newsletter email failed", e);
    }
    return { ok: true };
  });