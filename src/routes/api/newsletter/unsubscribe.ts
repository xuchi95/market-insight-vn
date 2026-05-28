import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({ token: z.string().uuid() });

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

        const { data, error } = await supabaseAdmin
          .from("newsletter_subscribers")
          .update({ unsubscribed_at: new Date().toISOString() })
          .eq("unsubscribe_token", parsed.data.token)
          .select("email")
          .maybeSingle();
        if (error) return Response.json({ error: "db_error" }, { status: 500 });
        if (!data) return Response.json({ error: "not_found" }, { status: 404 });

        return Response.json({ ok: true, email: data.email });
      },
    },
  },
});