import { createFileRoute } from "@tanstack/react-router";

// Google News RSS aggregator — free, no API key required, returns both
// Vietnamese and English sources. We fetch two locales (VN + US) in
// parallel, merge, dedupe by title and return a clean JSON payload.

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

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function parseRss(xml: string, lang: string): NewsPayload["items"] {
  const items: NewsPayload["items"] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/g;
  const blocks = xml.match(itemRe) ?? [];
  for (const block of blocks) {
    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const linkRaw = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
    const descRaw = block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
    const pubRaw = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const sourceTag = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "";
    const guidRaw = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? "";

    const fullTitle = decodeEntities(titleRaw).trim();
    if (!fullTitle) continue;
    // Google News titles end with " - Source Name"
    let source = decodeEntities(sourceTag).trim();
    let title = fullTitle;
    const dashIdx = fullTitle.lastIndexOf(" - ");
    if (!source && dashIdx > 0 && dashIdx > fullTitle.length - 60) {
      source = fullTitle.slice(dashIdx + 3).trim();
      title = fullTitle.slice(0, dashIdx).trim();
    } else if (source && fullTitle.endsWith(` - ${source}`)) {
      title = fullTitle.slice(0, fullTitle.length - source.length - 3).trim();
    }

    const url = decodeEntities(linkRaw).trim();
    if (!url || !title) continue;
    const body = stripTags(descRaw).slice(0, 280);
    const publishedAt = pubRaw ? Date.parse(pubRaw) : 0;
    const id = decodeEntities(guidRaw).trim() || url;

    items.push({
      id,
      title,
      url,
      body,
      image: "",
      source: source || "Google News",
      sourceImage: "",
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
      tags: [lang],
    });
  }
  return items;
}

// Map common ticker symbols to a more useful search query (full name + symbol).
const COIN_QUERY: Record<string, string> = {
  BTC: "Bitcoin BTC",
  ETH: "Ethereum ETH",
  USDT: "Tether USDT stablecoin",
  BNB: "BNB Binance Coin",
  SOL: "Solana SOL",
  XRP: "XRP Ripple",
  DOGE: "Dogecoin DOGE",
  TON: '"Toncoin" OR "TON crypto"',
  ADA: "Cardano ADA",
  AVAX: "Avalanche AVAX",
  TRX: "Tron TRX",
  LINK: "Chainlink LINK",
  DOT: "Polkadot DOT",
  MATIC: "Polygon MATIC",
  POL: "Polygon POL",
  SHIB: "Shiba Inu SHIB",
  LTC: "Litecoin LTC",
  BCH: "Bitcoin Cash BCH",
  UNI: "Uniswap UNI",
  XLM: "Stellar XLM",
  NEAR: "NEAR Protocol",
  ICP: "Internet Computer ICP",
  APT: "Aptos APT",
  ATOM: "Cosmos ATOM",
  XMR: "Monero XMR",
  ETC: "Ethereum Classic ETC",
  FIL: "Filecoin FIL",
  HBAR: "Hedera HBAR",
  ARB: "Arbitrum ARB",
  VET: "VeChain VET",
  MKR: "Maker MKR DAI",
  RENDER: "Render RNDR",
  INJ: "Injective INJ",
  OP: "Optimism OP crypto",
  SUI: "Sui SUI crypto",
  PEPE: "Pepe coin PEPE",
  USDC: "USDC stablecoin",
  DAI: "DAI stablecoin",
  WBTC: "Wrapped Bitcoin WBTC",
  LEO: "LEO Token Bitfinex",
  KAS: "Kaspa KAS",
};

function buildQuery(category: string): string {
  const sym = category.toUpperCase();
  if (COIN_QUERY[sym]) return COIN_QUERY[sym];
  if (sym) return `${sym} cryptocurrency`;
  return "cryptocurrency Bitcoin";
}

async function fetchGoogleNews(query: string, locale: { hl: string; gl: string; ceid: string }): Promise<NewsPayload["items"]> {
  const u = new URL("https://news.google.com/rss/search");
  u.searchParams.set("q", query);
  u.searchParams.set("hl", locale.hl);
  u.searchParams.set("gl", locale.gl);
  u.searchParams.set("ceid", locale.ceid);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u, {
      signal: ctrl.signal,
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!r.ok) throw new Error(`google-news ${r.status}`);
    const xml = await r.text();
    return parseRss(xml, locale.hl);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNews(category: string): Promise<NewsPayload> {
  const q = buildQuery(category);
  const results = await Promise.allSettled([
    fetchGoogleNews(q, { hl: "vi", gl: "VN", ceid: "VN:vi" }),
    fetchGoogleNews(q, { hl: "en-US", gl: "US", ceid: "US:en" }),
  ]);
  const merged: NewsPayload["items"] = [];
  for (const r of results) if (r.status === "fulfilled") merged.push(...r.value);

  // Dedupe by normalized title.
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

function refresh(category: string): Promise<NewsPayload> {
  const k = category || "_all";
  if (inflight.has(k)) return inflight.get(k)!;
  const p = fetchNews(category)
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
          const c = cache.get(k);
          let payload: NewsPayload;
          const age = c ? Date.now() - c.at : Infinity;
          if (c && age < FRESH_MS) {
            payload = c.payload;
          } else if (c && age < SWR_MS) {
            payload = c.payload;
            refresh(category).catch(() => {});
          } else {
            try {
              payload = await refresh(category);
            } catch (e) {
              if (c) payload = c.payload;
              else throw e;
            }
          }
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=1800",
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