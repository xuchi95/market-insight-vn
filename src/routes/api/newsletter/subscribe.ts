import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import { newsletterConfirmEmail } from "@/lib/email/templates.server";

const Schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.string().max(60).optional(),
  topics: z.array(z.string().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/)).max(20).optional(),
  metadata: z.record(z.string().max(60), z.string().max(500)).optional(),
});

export const Route = createFileRoute("/api/newsletter/subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = Schema.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
        }
        const { email, source, topics, metadata } = parsed.data;
        const row = {
          email,
          source: source ?? "footer",
          unsubscribed_at: null,
          ...(topics && topics.length > 0 ? { topics } : {}),
        };
        const { error } = await supabaseAdmin
          .from("newsletter_subscribers")
          .upsert(row, { onConflict: "email" });
        if (metadata && Object.keys(metadata).length > 0) {
          console.log("newsletter signup metadata", { email, source, metadata });
        }
        if (error) {
          console.error("newsletter upsert failed", error);
          return Response.json({ error: "db_error" }, { status: 500 });
        }
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
        return Response.json({ ok: true });
      },
    },
  },
});