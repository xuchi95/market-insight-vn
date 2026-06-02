import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import { newsletterConfirmEmail } from "@/lib/email/templates.server";

const EmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

const VALID_TOPICS = ["gold", "btc", "usd"] as const;
const TopicSchema = z.enum(VALID_TOPICS);

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
      .select("id, email, source, confirmed_at, unsubscribed_at, created_at, topics")
      .or(`user_id.eq.${userId},email.eq.${(profile?.email ?? "__none__").toLowerCase()}`)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);

    return {
      accountEmail: profile?.email ?? null,
      subscriptions: subs ?? [],
    };
  });

export const updateNewsletterTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().trim().toLowerCase().email().max(254),
      topics: z.array(TopicSchema).min(1).max(3),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ topics: data.topics })
      .eq("email", data.email);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EmailSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { email } = data;
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .upsert(
        { email, source: "settings", unsubscribed_at: null, confirmed_at: new Date().toISOString(), user_id: context.userId },
        { onConflict: "email" },
      );
    if (error) throw new Error(error.message);
    try {
      const { data: row } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("unsubscribe_token")
        .eq("email", email)
        .maybeSingle();
      const unsubUrl = row?.unsubscribe_token
        ? `https://marketwatch.vn/huy-ban-tin?token=${encodeURIComponent(row.unsubscribe_token)}`
        : undefined;
      const { subject, html } = newsletterConfirmEmail({ email, unsubUrl });
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
  .handler(async ({ data, context }) => {
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
          user_id: context.userId,
        },
        { onConflict: "email" },
      );
    if (insErr) throw new Error(insErr.message);
    try {
      const { data: row } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("unsubscribe_token")
        .eq("email", data.newEmail)
        .maybeSingle();
      const unsubUrl = row?.unsubscribe_token
        ? `https://marketwatch.vn/huy-ban-tin?token=${encodeURIComponent(row.unsubscribe_token)}`
        : undefined;
      const { subject, html } = newsletterConfirmEmail({ email: data.newEmail, unsubUrl });
      await sendEmail({ to: data.newEmail, subject, html, tags: ["newsletter-confirm"] });
    } catch (e) {
      console.error("newsletter email failed", e);
    }
    return { ok: true };
  });