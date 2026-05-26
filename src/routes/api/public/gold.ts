import { createFileRoute } from "@tanstack/react-router";

// In-memory state for change computation between fetches
let cache: { at: number; data: MappedItem[] } | null = null;
let inflight: Promise<MappedItem[]> | null = null;
// Baseline mids from yesterday's PNJ history, keyed by gold_type name ("SJC", "PNJ").
// Values are normalized to the SAME unit as today's live mid (PNJ live = ngàn/chỉ).
let baseline: { date: string; mids: Record<string, number> } | null = null;
let baselineInflight: Promise<void> | null = null;
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

// PNJ history endpoint returns prices as Vietnamese-formatted strings in ngàn VND / lượng
// (e.g. "163.000" → 163000). Today's live feed reports in ngàn VND / chỉ
// (e.g. 16150). 1 lượng = 10 chỉ, so to compare both at the same scale we divide
// the history value by 10.
function parseVnNumber(s: string): number {
  if (!s) return 0;
  const cleaned = String(s).replace(/\./g, "").replace(/,/g, ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

interface HistoryPoint {
  gia_ban: string;
  gia_mua: string;
  updated_at: string;
}
interface HistoryGoldType {
  name: string;
  data: HistoryPoint[];
}
interface HistoryLocation {
  name: string;
  gold_type: HistoryGoldType[];
}
interface HistoryResponse {
  locations?: HistoryLocation[];
}

function ymdVN(date: Date): string {
  // Format YYYYMMDD in Vietnam timezone (UTC+7)
  const vn = new Date(date.getTime() + 7 * 3600_000);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function fetchHistoryFor(ymd: string): Promise<Record<string, number>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price-history?date=${ymd}`,
      { headers: { Accept: "application/json" }, signal: ctrl.signal },
    );
    if (!res.ok) throw new Error(`PNJ history ${res.status}`);
    const json = (await res.json()) as HistoryResponse;
    const mids: Record<string, number> = {};
    // Prefer TPHCM location; fall back to first location with data
    const locs = json.locations ?? [];
    const loc =
      locs.find((l) => l.name === "TPHCM" && l.gold_type.some((g) => g.data.length))
      ?? locs.find((l) => l.gold_type.some((g) => g.data.length));
    if (!loc) return mids;
    for (const gt of loc.gold_type) {
      if (!gt.data?.length) continue;
      // Use the last (closing) data point of the day
      const last = gt.data[gt.data.length - 1];
      const buy = parseVnNumber(last.gia_mua);
      const sell = parseVnNumber(last.gia_ban);
      if (!buy || !sell) continue;
      // Convert from ngàn/lượng to ngàn/chỉ to match today's live unit.
      mids[gt.name] = (buy + sell) / 2 / 10;
    }
    return mids;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureBaseline(): Promise<void> {
  const today = ymdVN(new Date());
  if (baseline && baseline.date === today) return;
  if (baselineInflight) return baselineInflight;
  baselineInflight = (async () => {
    // Try yesterday first, walking back up to 7 days if a day has no data (weekend/holiday).
    const now = Date.now();
    let found: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const d = ymdVN(new Date(now - i * 86400_000));
      try {
        const mids = await fetchHistoryFor(d);
        if (Object.keys(mids).length > 0) {
          found = mids;
          break;
        }
      } catch {
        // try previous day
      }
    }
    baseline = { date: today, mids: found };
  })().finally(() => {
    baselineInflight = null;
  });
  return baselineInflight;
}

// Map our row id/brand → which history gold_type to use as baseline.
function baselineKeyFor(item: MappedItem): string {
  if (item.brand === "SJC") return "SJC";
  // All PNJ-branded rows and nữ trang/nguyên liệu use the PNJ baseline.
  return "PNJ";
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

          // Make sure we have yesterday's baseline (cached for the day).
          // Don't block the response on this — if it isn't ready yet we
          // return 0% and the next request will have it.
          ensureBaseline().catch(() => {});

          const mids = baseline?.mids ?? {};
          const out = items.map((g) => {
            const todayMid = (g.buy + g.sell) / 2 / 1000; // back to ngàn/chỉ
            const key = baselineKeyFor(g);
            const prev = mids[key] ?? 0;
            const changePct =
              prev > 0 ? ((todayMid - prev) / prev) * 100 : 0;
            return { ...g, changePct };
          });

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