import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import { newsletterConfirmEmail } from "@/lib/email/templates.server";

const Schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.string().max(60).optional(),
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
        const { email, source } = parsed.data;
        const { error } = await supabaseAdmin
          .from("newsletter_subscribers")
          .upsert({ email, source: source ?? "footer", unsubscribed_at: null }, { onConflict: "email" });
        if (error) {
          console.error("newsletter upsert failed", error);
          return Response.json({ error: "db_error" }, { status: 500 });
        }
        try {
          const { subject, html } = newsletterConfirmEmail({ email });
          await sendEmail({ to: email, subject, html, tags: ["newsletter-confirm"] });
        } catch (e) {
          console.error("newsletter email failed", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});