import { createFileRoute } from "@tanstack/react-router";

// In-memory state for change computation between fetches
const prevMid = new Map<string, number>();
let cache: { at: number; data: MappedItem[] } | null = null;
let inflight: Promise<MappedItem[]> | null = null;
const CACHE_FRESH_MS = 60_000; // serve cache without refetch
const CACHE_SWR_MS = 10 * 60_000; // serve stale, refresh in background
const UPSTREAM_TIMEOUT_MS = 3_000;

interface PnjRow {
  masp: string;
  tensp: string;
  giaban: number | string;
  giamua: number | string;
}

interface PnjResponse {
  data?: PnjRow[];
  updateDate?: string;
}

interface MappedItem {
  id: string;
  brand: string;
  type: string;
  buy: number;
  sell: number;
  unit: string;
  updatedAt: number;
}

function parseVnDate(s: string): number {
  // "26/05/2026 13:38:45" or "26/05/2026 09:11"
  const m = s?.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return Date.now();
  const [, d, mo, y, h, mi, se] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se ?? "00"}+07:00`).getTime();
}

// PNJ API returns prices in thousand VND per lượng (e.g. 16150 = 16,150,000 VND/lượng).
// Map PNJ masp -> our row spec. Items not in this map are skipped.
const PNJ_MAP: Record<string, { id: string; brand: string; type: string }> = {
  SJC: { id: "sjc-1l", brand: "SJC", type: "Vàng miếng SJC 1L" },
  N24K: { id: "pnj-nhan", brand: "PNJ", type: "Nhẫn Trơn PNJ 999.9" },
  PNJ: { id: "pnj", brand: "PNJ", type: "Vàng PNJ - Phượng Hoàng" },
  KB: { id: "pnj-kimbao", brand: "PNJ", type: "Vàng Kim Bảo 999.9" },
  TL: { id: "pnj-tailoc", brand: "PNJ", type: "Vàng Phúc Lộc Tài 999.9" },
  "24K": { id: "nutrang-9999", brand: "Vàng 24K", type: "Vàng nữ trang 999.9" },
  "22K": { id: "nutrang-22k", brand: "Vàng 22K", type: "Vàng 916 (22K)" },
  "75": { id: "nutrang-18k", brand: "Vàng 18K", type: "Vàng 750 (18K)" },
  RAW_9999: { id: "nguyenlieu", brand: "Vàng 24K", type: "Vàng nguyên liệu 99.99" },
};

function mapLiveRows(items: PnjRow[], updatedAt: number): MappedItem[] {
  const out: MappedItem[] = [];
  for (const it of items) {
    const m = PNJ_MAP[it.masp];
    if (!m) continue;
    const buy = (typeof it.giamua === "number" ? it.giamua : parseFloat(it.giamua) || 0) * 1000;
    let sell = (typeof it.giaban === "number" ? it.giaban : parseFloat(it.giaban) || 0) * 1000;
    if (!buy) continue;
    if (!sell) sell = buy + 200_000; // raw material rows have no sell price
    out.push({ ...m, buy, sell, unit: "VND/lượng", updatedAt });
  }
  return out;
}

async function fetchLiveGold(): Promise<MappedItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      "https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price",
      { headers: { Accept: "application/json" }, signal: ctrl.signal },
    );
    if (!res.ok) throw new Error(`PNJ gold source ${res.status}`);
    const json = (await res.json()) as PnjResponse;
    const updatedAt = parseVnDate(json.updateDate ?? "");
    return mapLiveRows(json.data ?? [], updatedAt);
  } finally {
    clearTimeout(timer);
  }
}

function refreshInBackground() {
  if (inflight) return inflight;
  inflight = fetchLiveGold()
    .then((items) => {
      cache = { at: Date.now(), data: items };
      return items;
    })
    .catch((err) => {
      // keep existing cache on failure
      throw err;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const Route = createFileRoute("/api/public/gold")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const now = Date.now();
          let items: MappedItem[];
          const age = cache ? now - cache.at : Infinity;
          if (cache && age < CACHE_FRESH_MS) {
            // Fresh cache — serve immediately.
            items = cache.data;
          } else if (cache && age < CACHE_SWR_MS) {
            // Stale but acceptable — serve cache, refresh in background.
            items = cache.data;
            refreshInBackground().catch(() => {});
          } else {
            // No usable cache — must wait for upstream (or fail).
            try {
              items = await refreshInBackground();
            } catch (e) {
              if (cache) items = cache.data;
              else throw e;
            }
          }

          const out = items.map((g) => {
            const mid = (g.buy + g.sell) / 2;
            const prev = prevMid.get(g.id) ?? mid;
            const changePct = prev === 0 ? 0 : ((mid - prev) / prev) * 100;
            if (!prevMid.has(g.id)) prevMid.set(g.id, mid);
            return { ...g, changePct };
          });

          // Slowly update baseline so changes accumulate
          if (Math.random() < 0.25) {
            out.forEach((g) => prevMid.set(g.id, (g.buy + g.sell) / 2));
          }

          return Response.json(
            { items: out, fetchedAt: Date.now() },
            {
              headers: {
                "Cache-Control":
                  "public, max-age=30, s-maxage=60, stale-while-revalidate=600",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (err) {
          return Response.json(
            { error: (err as Error).message, items: [] },
            { status: 502 },
          );
        }
      },
    },
  },
});