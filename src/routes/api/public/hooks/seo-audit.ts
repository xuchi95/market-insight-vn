import { createFileRoute } from "@tanstack/react-router";
import { runFullAudit } from "@/lib/seo-audit.server";

/**
 * Cron hook: pg_cron POST -> chạy 1 lần audit SEO.
 * Bảo vệ bằng apikey header = SUPABASE_PUBLISHABLE_KEY.
 */
export const Route = createFileRoute("/api/public/hooks/seo-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const res = await runFullAudit("cron");
          return Response.json({ ok: true, ...res });
        } catch (e) {
          return Response.json(
            { ok: false, error: (e as Error).message },
            { status: 500 },
          );
        }
      },
    },
  },
});