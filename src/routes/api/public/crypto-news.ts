import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Cointelegraph RSS news aggregator. Endpoint công khai, KHÔNG cần API key.
// (CoinDesk Data API — nguồn cũ — giờ trả 401 "API key required" cho free
// tier, gây ra widget tin tức trống trơn.) Có thể bật/tắt qua cờ `cmc_enabled`
// trong `app_news_settings` (giữ tên cột cũ cho tương thích — bật/tắt toàn
// bộ widget tin tức).

const FRESH_MS = 5 * 60 * 1000; // 5 min
const SWR_MS = 30 * 60 * 1000;  // 30 min
const TIMEOUT_MS = 8_000;

interface NewsPayload {
  updatedAt: number;
  category: string;
  items: Array<{
    id: string;
    title: string;
    url: string;
    body: string;
    image: string;
    source: string;
    sourceImage: string;
    publishedAt: number;
    tags: string[];
  }>;
}

const cache = new Map<string, { at: number; payload: NewsPayload }>();
const inflight = new Map<string, Promise<NewsPayload>>();

// Cache nhỏ cho cờ bật/tắt CMC để không gọi DB mỗi request.
// Lưu cả updated_at để phát hiện thay đổi và xoá cache payload tương ứng.
let cmcFlagCache: { at: number; enabled: boolean; updatedAt: string | null } | null = null;
const FLAG_TTL_MS = 10_000;
let lastAppliedUpdatedAt: string | null = null;

async function readCmcFlag(): Promise<{ enabled: boolean; updatedAt: string | null }> {
  if (cmcFlagCache && Date.now() - cmcFlagCache.at < FLAG_TTL_MS) {
    return { enabled: cmcFlagCache.enabled, updatedAt: cmcFlagCache.updatedAt };
  }
  try {
    const { data } = await supabaseAdmin
      .from("app_news_settings")
      .select("cmc_enabled, updated_at")
      .eq("id", 1)
      .maybeSingle();
    const enabled = data?.cmc_enabled ?? true;
    const updatedAt = (data?.updated_at as string | null) ?? null;
    cmcFlagCache = { at: Date.now(), enabled, updatedAt };
    return { enabled, updatedAt };
  } catch {
    return { enabled: true, updatedAt: null };
  }
}

// ---- Cointelegraph RSS ----
// RSS feeds dạng `https://cointelegraph.com/rss/tag/<slug>` công khai, không
// cần API key. Cointelegraph dùng slug dạng tên đầy đủ (không phải mã ticker)
// nên cần map symbol -> slug; symbol không có trong map sẽ fallback sang feed
// tổng quát và lọc theo từ khoá.
const SYMBOL_TO_SLUG: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "xrp", DOGE: "dogecoin",
  ADA: "cardano", BNB: "binance-coin", USDT: "tether", USDC: "usd-coin",
  TRX: "tron", AVAX: "avalanche", DOT: "polkadot", LINK: "chainlink",
  MATIC: "polygon", POL: "polygon", LTC: "litecoin", BCH: "bitcoin-cash",
  ATOM: "cosmos", NEAR: "near-protocol", UNI: "uniswap", TON: "toncoin",
  SHIB: "shiba-inu", PEPE: "pepe", WBTC: "wrapped-bitcoin", ARB: "arbitrum",
  OP: "optimism", APT: "aptos", SUI: "sui", HBAR: "hedera",
  ICP: "internet-computer", FIL: "filecoin", IMX: "immutable-x",
  INJ: "injective", ETC: "ethereum-classic", XLM: "stellar", XMR: "monero",
  KAS: "kaspa", TAO: "bittensor", RENDER: "render", RNDR: "render",
  AAVE: "aave", MKR: "maker", LDO: "lido", FTM: "fantom", ALGO: "algorand",
  VET: "vechain", SAND: "the-sandbox", MANA: "decentraland", AXS: "axie-infinity",
  GRT: "the-graph", FET: "fetch-ai", CRO: "crypto-com", THETA: "theta",
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}
function pick(item: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(item);
  return m ? stripCdata(m[1]).trim() : "";
}
function pickAttr(item: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i");
  const m = re.exec(item);
  return m ? m[1] : "";
}
function htmlToText(html: string): string {
  return decodeXmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function firstImgSrc(html: string): string {
  const m = /<img[^>]+src="([^"]+)"/i.exec(html);
  return m ? m[1] : "";
}

async function fetchCointelegraphRss(slug: string): Promise<NewsPayload["items"]> {
  const url = slug
    ? `https://cointelegraph.com/rss/tag/${slug}`
    : "https://cointelegraph.com/rss";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!r.ok) throw new Error(`cointelegraph ${r.status}`);
    const xml = await r.text();
    const items: NewsPayload["items"] = [];
    const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml)) !== null) {
      const block = m[1];
      const title = decodeXmlEntities(pick(block, "title"));
      const link = decodeXmlEntities(pick(block, "link") || pick(block, "guid"));
      if (!title || !link) continue;
      const pub = pick(block, "pubDate") || pick(block, "dc:date");
      const ts = pub ? Date.parse(pub) : 0;
      const descHtml = pick(block, "description");
      const body = htmlToText(descHtml).slice(0, 280);
      const image = pickAttr(block, "media:content", "url")
        || pickAttr(block, "enclosure", "url")
        || firstImgSrc(descHtml);
      const creator = decodeXmlEntities(pick(block, "dc:creator"));
      const category = decodeXmlEntities(pick(block, "category")).toLowerCase();
      items.push({
        id: `cointelegraph:${link}`,
        title,
        url: link,
        body,
        image,
        source: creator || "Cointelegraph",
        sourceImage: "https://cointelegraph.com/favicon.ico",
        publishedAt: Number.isFinite(ts) ? ts : 0,
        tags: category ? [category] : ["news"],
      });
      if (items.length >= 40) break;
    }
    return items;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCointelegraphNews(symbol: string): Promise<NewsPayload["items"]> {
  const sym = (symbol || "").split(",")[0].toUpperCase();
  const slug = SYMBOL_TO_SLUG[sym] || sym.toLowerCase();
  // 1) Thử feed theo tag.
  let items = await fetchCointelegraphRss(slug).catch(() => [] as NewsPayload["items"]);
  if (items.length > 0) return items;
  // 2) Fallback: feed tổng quát, lọc theo symbol/slug xuất hiện trong title/body.
  const general = await fetchCointelegraphRss("").catch(() => [] as NewsPayload["items"]);
  if (!sym) return general;
  const needle = sym.toLowerCase();
  const slugNeedle = slug.replace(/-/g, " ");
  items = general.filter((it) => {
    const hay = `${it.title} ${it.body} ${it.tags.join(" ")}`.toLowerCase();
    return hay.includes(needle) || hay.includes(slugNeedle);
  });
  // 3) Nếu vẫn rỗng, trả về general để tránh widget trống — vẫn là tin crypto.
  return items.length > 0 ? items : general;
}

async function fetchNews(category: string, cmcOn: boolean): Promise<NewsPayload> {
  const merged: NewsPayload["items"] = cmcOn
    ? await fetchCointelegraphNews(category).catch(() => [])
    : [];

  // Dedupe by normalized title (defensive — sources can echo the same article).
  const seen = new Set<string>();
  const deduped: NewsPayload["items"] = [];
  for (const it of merged) {
    const key = it.title.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }
  deduped.sort((a, b) => b.publishedAt - a.publishedAt);
  return { updatedAt: Date.now(), category, items: deduped.slice(0, 40) };
}

function refresh(category: string, cmcOn: boolean): Promise<NewsPayload> {
  const k = category || "_all";
  if (inflight.has(k)) return inflight.get(k)!;
  const p = fetchNews(category, cmcOn)
    .then((payload) => {
      cache.set(k, { at: Date.now(), payload });
      return payload;
    })
    .finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/crypto-news")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const raw = (url.searchParams.get("category") || "").trim().toUpperCase();
          // Whitelist a-z0-9, comma, max 40 chars to avoid abuse.
          const category = /^[A-Z0-9,]{0,40}$/.test(raw) ? raw : "";
          const k = category || "_all";
          const { enabled: cmcOn, updatedAt } = await readCmcFlag();

          // Khi admin đổi cờ, updated_at thay đổi -> xoá cache payload để
          // phản ánh trạng thái mới ngay lập tức (không SWR phục vụ dữ liệu cũ).
          if (updatedAt && updatedAt !== lastAppliedUpdatedAt) {
            cache.clear();
            inflight.clear();
            lastAppliedUpdatedAt = updatedAt;
          }

          // Khi CMC tắt: luôn trả mảng rỗng, không dùng cache cũ, không cache lâu.
          if (!cmcOn) {
            const empty: NewsPayload = { updatedAt: Date.now(), category, items: [] };
            return new Response(JSON.stringify(empty), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                ...CORS,
              },
            });
          }

          const c = cache.get(k);
          let payload: NewsPayload;
          const age = c ? Date.now() - c.at : Infinity;
          if (c && age < FRESH_MS) {
            payload = c.payload;
          } else if (c && age < SWR_MS) {
            payload = c.payload;
            refresh(category, cmcOn).catch(() => {});
          } else {
            try {
              payload = await refresh(category, cmcOn);
            } catch (e) {
              if (c) payload = c.payload;
              else throw e;
            }
          }
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              // Client không cache (tránh phục vụ payload rỗng cũ khi đổi nguồn);
              // CDN edge cache 5 phút + SWR 30 phút để giảm tải.
              "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=1800",
              ...CORS,
            },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: (e as Error).message, items: [] }),
            { status: 502, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      },
    },
  },
});