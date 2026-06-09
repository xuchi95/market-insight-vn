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
  { path: "/du-doan-gia-ai", changefreq: "daily", priority: "0.9" },
  { path: "/tai-san/oil-brent", changefreq: "hourly", priority: "0.8" },
  { path: "/tai-san/oil-wti", changefreq: "hourly", priority: "0.8" },
  { path: "/gia-xang-dau", changefreq: "daily", priority: "0.85" },
  { path: "/lich-kinh-te", changefreq: "daily", priority: "0.75" },
  { path: "/api-cho-nha-phat-trien", changefreq: "monthly", priority: "0.6" },
  { path: "/yeu-cau-api-key", changefreq: "monthly", priority: "0.5" },
  { path: "/lien-he", changefreq: "weekly", priority: "0.6" },
  { path: "/ve-chung-toi", changefreq: "monthly", priority: "0.7" },
  { path: "/nguon-du-lieu", changefreq: "monthly", priority: "0.7" },
  { path: "/chinh-sach-bao-mat", changefreq: "monthly", priority: "0.4" },
  { path: "/dieu-khoan-su-dung", changefreq: "monthly", priority: "0.4" },
  { path: "/mien-tru-trach-nhiem", changefreq: "monthly", priority: "0.4" },
  { path: "/chinh-sach-cookie", changefreq: "monthly", priority: "0.3" },
];

// Crypto fallback — luôn có mặt trong sitemap kể cả khi API cold-start lỗi,
// tránh tình trạng Google báo "Google không xác định được URL" cho các trang
// /tai-san/<symbol> phổ biến (cũng là đích redirect 301 từ /asset/<symbol>).
const POPULAR_CRYPTO = [
  "btc","eth","usdt","bnb","sol","xrp","usdc","ada","doge","ton",
  "trx","avax","shib","dot","link","matic","pol","bch","near","ltc",
  "uni","icp","apt","dai","leo","kas","etc","xlm","atom","xmr",
  "okb","fil","stx","hbar","arb","vet","mkr","render","inj","op",
  "sui","pepe","wbtc",
];

// Vàng — các mã thường xuất hiện trong bảng giá vàng VN/quốc tế.
const POPULAR_GOLD = [
  "sjc","pnj-9999","doji","mihong","phunhuan","xau","xau-vn",
];

// Ngân hàng — các mã ngân hàng có trang chi tiết tỉ giá riêng.
const POPULAR_BANK = [
  "vcb","bidv","ctg","mbb","tcb","vpb","acb","hdb","stb","shb",
  "agribank","techcombank","sacombank",
];

// Cổ phiếu VN phổ biến (HOSE/HNX) — index trực tiếp trang chi tiết.
const POPULAR_VN_TICKERS = [
  // Ngân hàng
  "VCB", "BID", "CTG", "TCB", "MBB", "VPB", "ACB", "HDB", "STB", "MSB", "SHB",
  "VIB", "OCB", "EIB", "LPB", "TPB", "NAB", "BAB", "ABB", "KLB", "PGB", "BVB", "SGB", "VBB",
  // Thép / vật liệu
  "HPG", "HSG", "NKG", "SMC", "TVN", "POM", "VGS", "TLH",
  // Công nghệ / bán lẻ
  "FPT", "MWG", "PNJ", "FRT", "DGW", "PET", "CMG", "ELC", "ICT",
  // Vinhomes / bất động sản
  "VIC", "VHM", "VRE", "NVL", "KDH", "DXG", "PDR", "DIG", "NLG", "KBC", "KHG", "HDC",
  "CEO", "IJC", "ITA", "HAG", "HNG", "VCG", "CII", "SCR", "TCH", "QCG", "DXS",
  // Năng lượng / xăng dầu
  "GAS", "PLX", "BSR", "POW", "PVD", "PVS", "PVT", "PVC", "PVB", "PXS", "PVG",
  "REE", "GEX", "GEG", "PC1", "NT2", "VSH", "HDG", "TBC",
  // Hoá chất / phân bón
  "GVR", "DGC", "DCM", "DPM", "BFC", "LAS", "VHC", "ANV", "IDI",
  // Hàng không / logistics
  "VJC", "HVN", "ACV", "SCS", "GMD", "VSC", "HAH", "VTP", "TMS",
  // Chứng khoán
  "SSI", "VND", "VCI", "HCM", "FTS", "BSI", "MBS", "ORS", "AGR", "VIX", "BVS", "VDS",
  // Tiêu dùng / thực phẩm
  "VNM", "MSN", "SAB", "BHN", "VEA", "QNS", "KDC", "LSS", "SBT", "SLS",
  // Bảo hiểm
  "BVH", "BMI", "PVI", "MIG", "PGI", "BIC",
  // Công nghiệp / KCN
  "BCM", "IDC", "SZC", "SIP", "TIP", "LHG", "D2D",
  // Xây dựng / VLXD
  "CTD", "HBC", "VCG", "FCN", "PHC", "BMP", "NTP", "BCC", "HT1", "BCG",
  // Viễn thông / công nghệ Viettel
  "CTR", "VGI", "FOX",
  // Cao su / nông nghiệp
  "DPR", "PHR", "TRC", "BFC",
  // Thuỷ sản
  "MPC", "FMC", "CMX", "ACL", "ASM",
  // Khác phổ biến
  "MWG", "DHG", "TRA", "IMP", "DMC", "DBD", "PME", "OGC", "ROS",
];

async function fetchAssetEntries(): Promise<SitemapEntry[]> {
  const fallback: SitemapEntry[] = POPULAR_CRYPTO.map((sym) => ({
    path: `/tai-san/${sym}`,
    changefreq: "hourly",
    priority: "0.7",
  }));
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4_000);
    const res = await fetch(`${BASE_URL}/api/public/crypto`, {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
      // @ts-ignore - cloudflare worker fetch supports this
      cf: { cacheTtl: 60 },
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return fallback;
    const j: any = await res.json();
    if (!Array.isArray(j?.coins)) return fallback;
    const seen = new Set<string>();
    const entries: SitemapEntry[] = [];
    for (const c of j.coins) {
      const sym = String(c.symbol).toLowerCase();
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      entries.push({ path: `/tai-san/${sym}`, changefreq: "hourly", priority: "0.7" });
    }
    // Trộn fallback để đảm bảo các symbol "core" luôn có mặt.
    for (const f of fallback) {
      const sym = f.path.split("/").pop()!;
      if (!seen.has(sym)) {
        seen.add(sym);
        entries.push(f);
      }
    }
    return entries;
  } catch {
    return fallback;
  }
}

function goldEntries(): SitemapEntry[] {
  return POPULAR_GOLD.map((g) => ({
    path: `/tai-san/gold-${g}`,
    changefreq: "hourly" as const,
    priority: "0.65",
  }));
}

function bankEntries(): SitemapEntry[] {
  return POPULAR_BANK.map((b) => ({
    path: `/tai-san/bank-${b}`,
    changefreq: "daily" as const,
    priority: "0.6",
  }));
}

function vnStockEntries(): SitemapEntry[] {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  for (const sym of POPULAR_VN_TICKERS) {
    const slug = sym.toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    entries.push({
      path: `/co-phieu/${slug}`,
      changefreq: "hourly",
      priority: "0.8",
    });
  }
  return entries;
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
        const entries = [
          ...STATIC_ENTRIES,
          ...vnStockEntries(),
          ...assetEntries,
          ...goldEntries(),
          ...bankEntries(),
        ];
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
