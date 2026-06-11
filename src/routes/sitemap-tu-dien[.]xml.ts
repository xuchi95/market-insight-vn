import { createFileRoute } from "@tanstack/react-router";
import { GLOSSARY } from "@/lib/data/glossary";

const BASE_URL = "https://marketwatch.vn";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sitemap riêng cho toàn bộ trang Từ điển tài chính.
 * Tách khỏi sitemap.xml chính để:
 *  - Google index nhanh hơn (sitemap nhỏ → crawl-budget tốt hơn).
 *  - Cập nhật `lastmod` chỉ khi từ điển thay đổi (không bị ảnh hưởng bởi giá).
 *  - Dễ theo dõi coverage trong Search Console (báo cáo riêng từng sitemap).
 */
export const Route = createFileRoute("/sitemap-tu-dien.xml")({
  server: {
    handlers: {
      GET: async () => {
        const now = new Date().toISOString().slice(0, 10);

        const urls: string[] = [];

        // Trang index từ điển
        urls.push(
          [
            `  <url>`,
            `    <loc>${escapeXml(`${BASE_URL}/tu-dien`)}</loc>`,
            `    <lastmod>${now}</lastmod>`,
            `    <changefreq>weekly</changefreq>`,
            `    <priority>0.8</priority>`,
            `  </url>`,
          ].join("\n"),
        );

        // Mỗi thuật ngữ → 1 <url>
        for (const t of GLOSSARY) {
          urls.push(
            [
              `  <url>`,
              `    <loc>${escapeXml(`${BASE_URL}/tu-dien/${t.slug}`)}</loc>`,
              `    <lastmod>${now}</lastmod>`,
              `    <changefreq>monthly</changefreq>`,
              `    <priority>0.7</priority>`,
              `  </url>`,
            ].join("\n"),
          );
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

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