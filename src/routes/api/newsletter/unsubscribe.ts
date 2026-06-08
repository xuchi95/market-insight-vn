import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({ token: z.string().uuid() });
const TTL_DAYS = 180;

export const Route = createFileRoute("/api/newsletter/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid_token" }, { status: 400 });

        // Look up the row first so we can enforce TTL and distinguish expired
        // tokens from genuinely unknown ones.
        const { data: row, error: lookupErr } = await supabaseAdmin
          .from("newsletter_subscribers")
          .select("id, email, unsubscribe_token_issued_at, unsubscribed_at")
          .eq("unsubscribe_token", parsed.data.token)
          .maybeSingle();
        if (lookupErr) return Response.json({ error: "db_error" }, { status: 500 });
        if (!row) return Response.json({ error: "not_found" }, { status: 404 });

        const issuedAt = row.unsubscribe_token_issued_at
          ? Date.parse(row.unsubscribe_token_issued_at)
          : 0;
        const ageMs = Date.now() - issuedAt;
        if (!Number.isFinite(issuedAt) || ageMs > TTL_DAYS * 24 * 3600 * 1000) {
          // Rotate the expired token so it can never be replayed, even
          // if the row stays subscribed.
          await supabaseAdmin
            .from("newsletter_subscribers")
            .update({
              unsubscribe_token: crypto.randomUUID(),
              unsubscribe_token_issued_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          return Response.json({ error: "expired" }, { status: 410 });
        }

        // Mark unsubscribed AND rotate the token to enforce single use.
        const { error: updErr } = await supabaseAdmin
          .from("newsletter_subscribers")
          .update({
            unsubscribed_at: row.unsubscribed_at ?? new Date().toISOString(),
            unsubscribe_token: crypto.randomUUID(),
            unsubscribe_token_issued_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (updErr) return Response.json({ error: "db_error" }, { status: 500 });

        return Response.json({ ok: true, email: row.email });
      },
    },
  },
});