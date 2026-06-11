import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://marketwatch.vn";

/**
 * Sitemap index — gom các sitemap chuyên biệt:
 *  - /sitemap.xml         : nội dung chính (giá, trang công cụ, cổ phiếu, vàng…)
 *  - /sitemap-tu-dien.xml : toàn bộ trang từ điển tài chính
 * Google sẽ crawl từng sitemap con riêng và báo cáo coverage độc lập.
 */
export const Route = createFileRoute("/sitemap-index.xml")({
  server: {
    handlers: {
      GET: async () => {
        const now = new Date().toISOString();
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-tu-dien.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});