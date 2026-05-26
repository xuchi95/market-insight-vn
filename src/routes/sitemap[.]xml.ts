import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://market-insight-vn.lovable.app";

interface Entry { path: string; changefreq?: string; priority?: string }

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const now = new Date().toISOString().slice(0, 10);
        const entries: Entry[] = [
          { path: "/", changefreq: "hourly", priority: "1.0" },
          { path: "/gold", changefreq: "hourly", priority: "0.9" },
          { path: "/stocks", changefreq: "hourly", priority: "0.9" },
          { path: "/crypto", changefreq: "hourly", priority: "0.9" },
          { path: "/forex", changefreq: "hourly", priority: "0.9" },
          { path: "/bank-rates", changefreq: "hourly", priority: "0.9" },
          { path: "/converter", changefreq: "daily", priority: "0.8" },
        ];
        const urls = entries.map((e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
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