import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// CoinMarketCap Content API aggregator. Requires CMC_API_KEY and the
// `cmc_enabled` flag in `app_news_settings`. When disabled or the key is
// missing the endpoint simply returns an empty list.

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

// ---- CoinMarketCap content endpoint ----
// Requires CMC_API_KEY (CoinMarketCap Pro). Endpoint: /v1/content/latest
// Docs: https://coinmarketcap.com/api/documentation/v1/#operation/getV1ContentLatest
async function fetchCoinMarketCap(symbol: string): Promise<NewsPayload["items"]> {
  const key = process.env.CMC_API_KEY || process.env.COINMARKETCAP_API_KEY;
  if (!key || !symbol) return [];
  const u = new URL("https://pro-api.coinmarketcap.com/v1/content/latest");
  u.searchParams.set("symbol", symbol);
  u.searchParams.set("limit", "20");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u, {
      signal: ctrl.signal,
      headers: { "X-CMC_PRO_API_KEY": key, accept: "application/json" },
    });
    if (!r.ok) throw new Error(`cmc ${r.status}`);
    const json = (await r.json()) as {
      data?: Array<{
        slug?: string;
        title?: string;
        subtitle?: string;
        cover?: string;
        source_name?: string;
        source_url?: string;
        released_at?: string;
        type?: string;
        assets?: Array<{ symbol?: string }>;
      }>;
    };
    const items: NewsPayload["items"] = [];
    for (const it of json.data ?? []) {
      const url = (it.source_url || "").trim();
      const title = (it.title || "").trim();
      if (!url || !title) continue;
      const publishedAt = it.released_at ? Date.parse(it.released_at) : 0;
      items.push({
        id: `cmc:${it.slug || url}`,
        title,
        url,
        body: (it.subtitle || "").slice(0, 280),
        image: it.cover || "",
        source: it.source_name || "CoinMarketCap",
        sourceImage: "",
        publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
        tags: ["cmc", it.type || "news"],
      });
    }
    return items;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNews(category: string, cmcOn: boolean): Promise<NewsPayload> {
  const merged: NewsPayload["items"] = cmcOn
    ? await fetchCoinMarketCap(category).catch(() => [])
    : [];

  // Dedupe by normalized title (defensive — CMC can echo the same article).
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