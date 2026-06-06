import { createFileRoute } from "@tanstack/react-router";

// CryptoCompare news API — free, no API key required.
// Docs: https://min-api.cryptocompare.com/documentation?key=News
// `categories` accepts coin tickers (BTC, ETH, …) plus generic tags.

const FRESH_MS = 5 * 60 * 1000; // 5 min
const SWR_MS = 30 * 60 * 1000;  // 30 min
const TIMEOUT_MS = 6_000;

interface CCNewsItem {
  id?: string;
  guid?: string;
  published_on?: number;
  imageurl?: string;
  title?: string;
  url?: string;
  body?: string;
  source?: string;
  source_info?: { name?: string; img?: string };
  categories?: string;
  tags?: string;
  lang?: string;
}

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

async function fetchNews(category: string): Promise<NewsPayload> {
  const u = new URL("https://min-api.cryptocompare.com/data/v2/news/");
  u.searchParams.set("lang", "EN");
  u.searchParams.set("excludeCategories", "Sponsored");
  if (category) u.searchParams.set("categories", category);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`cryptocompare ${r.status}`);
    const j: any = await r.json();
    const rawItems = Array.isArray(j?.Data) ? (j.Data as CCNewsItem[]) : [];
    const items: NewsPayload["items"] = rawItems
      .slice(0, 30)
      .map((it) => ({
        id: String(it.id ?? it.guid ?? it.url ?? Math.random()),
        title: String(it.title ?? ""),
        url: String(it.url ?? ""),
        body: String(it.body ?? "").slice(0, 320),
        image: String(it.imageurl ?? ""),
        source: String(it.source_info?.name ?? it.source ?? ""),
        sourceImage: String(it.source_info?.img ?? ""),
        publishedAt: Number(it.published_on ?? 0) * 1000,
        tags: String(it.tags ?? "")
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 6),
      }))
      .filter((it) => it.title && it.url);
    return { updatedAt: Date.now(), category, items };
  } finally {
    clearTimeout(timer);
  }
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