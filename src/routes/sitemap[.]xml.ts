import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://market-insight-vn.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "hourly", priority: "1.0" },
  { path: "/gold", changefreq: "hourly", priority: "0.9" },
  { path: "/stocks", changefreq: "hourly", priority: "0.9" },
  { path: "/crypto", changefreq: "hourly", priority: "0.9" },
  { path: "/forex", changefreq: "hourly", priority: "0.9" },
  { path: "/bank-rates", changefreq: "hourly", priority: "0.9" },
  { path: "/converter", changefreq: "daily", priority: "0.8" },
  { path: "/contact", changefreq: "weekly", priority: "0.6" },
  { path: "/privacy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms", changefreq: "monthly", priority: "0.4" },
  { path: "/disclaimer", changefreq: "monthly", priority: "0.4" },
];

async function fetchAssetEntries(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/public/crypto`, {
      headers: { accept: "application/json" },
      // @ts-ignore - cloudflare worker fetch supports this
      cf: { cacheTtl: 60 },
    });
    if (!res.ok) return [];
    const j: any = await res.json();
    if (!Array.isArray(j?.coins)) return [];
    return j.coins.map((c: any) => ({
      path: `/asset/${String(c.symbol).toLowerCase()}`,
      changefreq: "hourly" as const,
      priority: "0.7",
    }));
  } catch {
    return [];
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderUrl(e: SitemapEntry, now: string): string {
  const lines: string[] = [`  <url>`];
  lines.push(`    <loc>${escapeXml(`${BASE_URL}${e.path}`)}</loc>`);
  lines.push(`    <lastmod>${now}</lastmod>`);
  if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
  if (e.priority) lines.push(`    <priority>${e.priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const now = new Date().toISOString().slice(0, 10);
        const assetEntries = await fetchAssetEntries();
        const entries = [...STATIC_ENTRIES, ...assetEntries];
        const urls = entries.map((e) => renderUrl(e, now)).join("\n");

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
