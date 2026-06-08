import { createServerFn } from "@tanstack/react-start";
import { requireAdmin, logAudit } from "./middleware.server";

const SITE_URL = "https://marketwatch.vn/";
const SITEMAP_URL = "https://marketwatch.vn/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

/**
 * Admin-triggered resubmit sitemap to Google Search Console.
 * Cùng logic với cron hook /api/public/hooks/gsc-resubmit-sitemap,
 * nhưng chạy thủ công từ trang Admin SEO theo nhu cầu.
 */
export const resubmitSitemapToGsc = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
    if (!lovableKey || !gscKey) {
      throw new Error("Thiếu LOVABLE_API_KEY hoặc GOOGLE_SEARCH_CONSOLE_API_KEY");
    }

    const siteEnc = encodeURIComponent(SITE_URL);
    const sitemapEnc = encodeURIComponent(SITEMAP_URL);
    const url = `${GATEWAY}/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
      },
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`GSC trả về ${res.status}: ${bodyText.slice(0, 300)}`);
    }

    await logAudit(context.userId, "gsc.sitemap_resubmit", "sitemap", SITEMAP_URL, {
      site: SITE_URL,
    });

    return {
      ok: true,
      submitted: SITEMAP_URL,
      site: SITE_URL,
      at: new Date().toISOString(),
    };
  });