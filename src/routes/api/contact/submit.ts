import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend.server";
import { contactConfirmEmail, contactForwardEmail } from "@/lib/email/templates.server";

const Schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
});

export const Route = createFileRoute("/api/contact/submit")({
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
        const { name, email, subject, message } = parsed.data;
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;

        const { error } = await supabaseAdmin
          .from("contact_submissions")
          .insert({ name, email, subject: subject ?? null, message });
        if (error) {
          console.error("contact insert failed", error);
          return Response.json({ error: "db_error" }, { status: 500 });
        }
        try {
          const ack = contactConfirmEmail({ name, message });
          await sendEmail({ to: email, subject: ack.subject, html: ack.html, replyTo: "contact@marketwatch.vn", tags: ["contact-ack"] });
          const fwd = contactForwardEmail({ name, email, subject, message, ip });
          await sendEmail({ to: "contact@marketwatch.vn", subject: fwd.subject, html: fwd.html, replyTo: email, tags: ["contact-fwd"] });
        } catch (e) {
          console.error("contact email failed", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});