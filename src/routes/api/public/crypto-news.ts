import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// CoinDesk Data API news aggregator. Endpoint công khai, KHÔNG cần API key.
// Có thể bật/tắt qua cờ `cmc_enabled` trong `app_news_settings` (giữ tên cột
// cũ cho tương thích — bật/tắt toàn bộ widget tin tức).

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

// ---- CoinDesk Data API ----
// Docs: https://developers.coindesk.com/documentation/data-api/news_v1_article_list
// Endpoint công khai (không cần key cho free tier). Lọc theo `categories` là
// mã symbol viết hoa (BTC, ETH, SOL, ...). Nếu symbol không có category tương
// ứng, API trả về tin tổng hợp — vẫn hữu ích.
async function fetchCoinDeskNews(symbol: string): Promise<NewsPayload["items"]> {
  const u = new URL("https://data-api.coindesk.com/news/v1/article/list");
  u.searchParams.set("lang", "EN");
  u.searchParams.set("limit", "40");
  if (symbol) u.searchParams.set("categories", symbol.split(",")[0]);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!r.ok) throw new Error(`coindesk ${r.status}`);
    const json = (await r.json()) as {
      Data?: Array<{
        ID?: number;
        GUID?: string;
        TITLE?: string;
        SUBTITLE?: string | null;
        BODY?: string;
        URL?: string;
        IMAGE_URL?: string;
        PUBLISHED_ON?: number;
        AUTHORS?: string;
        SOURCE_DATA?: { NAME?: string; IMAGE_URL?: string };
        CATEGORY_DATA?: Array<{ CATEGORY?: string; NAME?: string }>;
      }>;
    };
    const items: NewsPayload["items"] = [];
    for (const it of json.Data ?? []) {
      const title = (it.TITLE || "").trim();
      const url = it.URL || it.GUID || "";
      if (!title || !url) continue;
      const id = String(it.ID ?? url);
      const ts =
        typeof it.PUBLISHED_ON === "number"
          ? it.PUBLISHED_ON * (it.PUBLISHED_ON < 1e12 ? 1000 : 1)
          : 0;
      const body = (it.SUBTITLE || it.BODY || "").trim().slice(0, 280);
      const sourceName = it.SOURCE_DATA?.NAME || it.AUTHORS || "CoinDesk";
      const tags = (it.CATEGORY_DATA ?? [])
        .map((c) => (c.CATEGORY || c.NAME || "").toLowerCase())
        .filter(Boolean)
        .slice(0, 5);
      items.push({
        id: `coindesk:${id}`,
        title,
        url,
        body,
        image: it.IMAGE_URL || "",
        source: sourceName,
        sourceImage: it.SOURCE_DATA?.IMAGE_URL || "",
        publishedAt: Number.isFinite(ts) ? ts : 0,
        tags: tags.length ? tags : ["news"],
      });
    }
    return items;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNews(category: string, cmcOn: boolean): Promise<NewsPayload> {
  const merged: NewsPayload["items"] = cmcOn
    ? await fetchCoinDeskNews(category).catch(() => [])
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