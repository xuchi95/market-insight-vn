import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://marketwatch.vn";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "hourly", priority: "1.0" },
  { path: "/gia-vang", changefreq: "hourly", priority: "0.9" },
  { path: "/chung-khoan", changefreq: "hourly", priority: "0.9" },
  { path: "/tien-dien-tu", changefreq: "hourly", priority: "0.9" },
  { path: "/ty-gia-ngoai-te", changefreq: "hourly", priority: "0.9" },
  { path: "/ty-gia-ngan-hang", changefreq: "hourly", priority: "0.9" },
  { path: "/quy-doi-tien-te", changefreq: "daily", priority: "0.8" },
  { path: "/lai-suat-tiet-kiem", changefreq: "daily", priority: "0.9" },
  { path: "/tinh-lai-suat-tiet-kiem", changefreq: "weekly", priority: "0.9" },
  { path: "/vi-mo-viet-nam", changefreq: "daily", priority: "0.85" },
  { path: "/cong-cu/dca-roi", changefreq: "monthly", priority: "0.7" },
  { path: "/tai-san/oil-brent", changefreq: "hourly", priority: "0.8" },
  { path: "/tai-san/oil-wti", changefreq: "hourly", priority: "0.8" },
  { path: "/gia-xang-dau", changefreq: "daily", priority: "0.85" },
  { path: "/lich-kinh-te", changefreq: "daily", priority: "0.75" },
  { path: "/api-cho-nha-phat-trien", changefreq: "monthly", priority: "0.6" },
  { path: "/lien-he", changefreq: "weekly", priority: "0.6" },
  { path: "/chinh-sach-bao-mat", changefreq: "monthly", priority: "0.4" },
  { path: "/dieu-khoan-su-dung", changefreq: "monthly", priority: "0.4" },
  { path: "/mien-tru-trach-nhiem", changefreq: "monthly", priority: "0.4" },
  { path: "/chinh-sach-cookie", changefreq: "monthly", priority: "0.3" },
];

// Cổ phiếu VN phổ biến (HOSE/HNX) — index trực tiếp trang chi tiết.
const POPULAR_VN_TICKERS = [
  "VNM", "VCB", "BID", "CTG", "TCB", "MBB", "VPB", "ACB", "HDB", "STB", "MSB", "SHB",
  "HPG", "HSG", "NKG", "FPT", "MWG", "PNJ", "MSN", "VIC", "VHM", "VRE", "NVL", "KDH",
  "GAS", "PLX", "BSR", "POW", "REE", "GVR", "DGC", "DCM", "DPM", "VJC", "HVN", "SSI",
  "VND", "VCI", "HCM",
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
    const entries: SitemapEntry[] = [];
    for (const c of j.coins) {
      const sym = String(c.symbol).toLowerCase();
      entries.push({ path: `/tai-san/${sym}`, changefreq: "hourly", priority: "0.7" });
    }
    return entries;
  } catch {
    return [];
  }
}

function vnStockEntries(): SitemapEntry[] {
  return POPULAR_VN_TICKERS.map((sym) => ({
    path: `/co-phieu/${sym.toLowerCase()}`,
    changefreq: "hourly" as const,
    priority: "0.8",
  }));
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
        const entries = [...STATIC_ENTRIES, ...vnStockEntries(), ...assetEntries];
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
