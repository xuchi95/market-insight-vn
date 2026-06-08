import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron hook: resubmit sitemap lên Google Search Console qua Connector Gateway.
 * Google đã bỏ legacy ping endpoint (06/2023) — phải dùng API sitemaps.submit.
 *
 * Bảo vệ bằng apikey header = SUPABASE_PUBLISHABLE_KEY (giống các hook khác).
 * Có thể gọi thủ công sau mỗi lần publish lớn để force Googlebot phát hiện.
 */

const SITE_URL = "https://marketwatch.vn/";
const SITEMAP_URL = "https://marketwatch.vn/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

export const Route = createFileRoute("/api/public/hooks/gsc-resubmit-sitemap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
        if (!lovableKey || !gscKey) {
          return Response.json(
            { ok: false, error: "Missing LOVABLE_API_KEY or GOOGLE_SEARCH_CONSOLE_API_KEY" },
            { status: 500 },
          );
        }

        const siteEnc = encodeURIComponent(SITE_URL);
        const sitemapEnc = encodeURIComponent(SITEMAP_URL);
        const url = `${GATEWAY}/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}`;

        try {
          const res = await fetch(url, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": gscKey,
            },
          });

          const bodyText = await res.text();
          if (!res.ok) {
            return Response.json(
              {
                ok: false,
                status: res.status,
                error: bodyText.slice(0, 500),
                sitemap: SITEMAP_URL,
              },
              { status: 502 },
            );
          }

          return Response.json({
            ok: true,
            submitted: SITEMAP_URL,
            site: SITE_URL,
            at: new Date().toISOString(),
          });
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