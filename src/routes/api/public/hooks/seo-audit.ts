import { createFileRoute } from "@tanstack/react-router";
import { runFullAudit } from "@/lib/seo-audit.server";
import { requireCronAuth } from "@/lib/cron-auth.server";

/**
 * Cron hook: pg_cron POST -> chạy 1 lần audit SEO.
 * Bảo vệ bằng apikey header = SUPABASE_PUBLISHABLE_KEY.
 */
export const Route = createFileRoute("/api/public/hooks/seo-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
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