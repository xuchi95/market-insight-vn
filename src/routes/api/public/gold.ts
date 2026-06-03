import { createFileRoute } from "@tanstack/react-router";
import {
  midOf,
  parseVnNumber,
  vndPerChiFromNganChi,
  vndPerChiFromNganLuong,
} from "@/lib/gold-units";
import { readPriceCache, writePriceCache } from "@/lib/price-cache.server";

// In-memory state for change computation between fetches
let cache: { at: number; data: MappedItem[] } | null = null;
let inflight: Promise<MappedItem[]> | null = null;
// Baseline mids from yesterday's PNJ history, keyed by gold_type name ("SJC", "PNJ").
// Values are normalized to the SAME unit as today's live mid (PNJ live = ngàn/chỉ).
let baseline: { date: string; mids: Record<string, number> } | null = null;
let baselineInflight: Promise<void> | null = null;
const CACHE_FRESH_MS = 20_000; // serve cache without refetch (~20s realtime cadence)
const CACHE_SWR_MS = 5 * 60_000; // serve stale, refresh in background
const UPSTREAM_TIMEOUT_MS = 4_000;

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
  mid: number;
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

// PNJ API returns prices in thousand VND per chỉ (e.g. 16150 = 16,150,000 VND/chỉ).
// Map PNJ masp -> our row spec. Items not in this map are skipped.
const PNJ_MAP: Record<string, { id: string; brand: string; type: string }> = {
  SJC: { id: "sjc-1l", brand: "SJC", type: "Vàng miếng SJC 1L" },
  N24K: { id: "pnj-nhan", brand: "PNJ", type: "Nhẫn Trơn PNJ 999.9" },
  PNJ: { id: "pnj", brand: "PNJ", type: "Vàng PNJ - Phượng Hoàng" },
  KB: { id: "pnj-kimbao", brand: "PNJ", type: "Vàng Kim Bảo 999.9" },
  TL: { id: "pnj-tailoc", brand: "PNJ", type: "Vàng Phúc Lộc Tài 999.9" },
  "24K": { id: "nutrang-9999", brand: "Vàng 24K", type: "Vàng nữ trang 999.9" },
  "999": { id: "nutrang-999", brand: "Vàng 24K", type: "Vàng nữ trang 999" },
  "9920": { id: "nutrang-9920", brand: "Vàng 24K", type: "Vàng nữ trang 9920" },
  "99": { id: "nutrang-99", brand: "Vàng 24K", type: "Vàng nữ trang 99" },
  "22K": { id: "nutrang-22k", brand: "Vàng 22K", type: "Vàng 916 (22K)" },
  "75": { id: "nutrang-18k", brand: "Vàng 18K", type: "Vàng 750 (18K)" },
  "68": { id: "nutrang-16k", brand: "Vàng 16K", type: "Vàng 680 (16.3K)" },
  "65": { id: "nutrang-15k", brand: "Vàng 15K", type: "Vàng 650 (15.6K)" },
  "61": { id: "nutrang-14_6k", brand: "Vàng 14K", type: "Vàng 610 (14.6K)" },
  "58.5": { id: "nutrang-14k", brand: "Vàng 14K", type: "Vàng 585 (14K)" },
  "41": { id: "nutrang-10k", brand: "Vàng 10K", type: "Vàng 416 (10K)" },
  "37.5": { id: "nutrang-9k", brand: "Vàng 9K", type: "Vàng 375 (9K)" },
  "33": { id: "nutrang-8k", brand: "Vàng 8K", type: "Vàng 333 (8K)" },
  RAW_9999: { id: "nguyenlieu", brand: "Vàng 24K", type: "Vàng nguyên liệu 99.99" },
  RAW_9900: { id: "nguyenlieu-99", brand: "Vàng 24K", type: "Vàng nguyên liệu 99" },
};

function mapLiveRows(items: PnjRow[], updatedAt: number): MappedItem[] {
  const out: MappedItem[] = [];
  for (const it of items) {
    const m = PNJ_MAP[it.masp];
    if (!m) continue;
    const buyRaw = typeof it.giamua === "number" ? it.giamua : parseFloat(String(it.giamua)) || 0;
    const sellRaw = typeof it.giaban === "number" ? it.giaban : parseFloat(String(it.giaban)) || 0;
    const buy = vndPerChiFromNganChi(buyRaw);
    let sell = vndPerChiFromNganChi(sellRaw);
    if (!buy) continue;
    if (!sell) sell = buy + 200_000; // raw material rows have no sell price
    out.push({ ...m, buy, sell, mid: midOf(buy, sell), unit: "VND/chỉ", updatedAt });
  }
  return out;
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
      // History đơn vị "ngàn/lượng" → chuyển về VND/chỉ để so sánh đồng nhất với live.
      mids[gt.name] = midOf(vndPerChiFromNganLuong(buy), vndPerChiFromNganLuong(sell));
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
    // Fetch the last 7 days in PARALLEL (mỗi ngày timeout 4s).
    // Tuần tự worst-case ~28s và chặn cold-start request.
    const now = Date.now();
    const days = Array.from({ length: 7 }, (_, i) =>
      ymdVN(new Date(now - (i + 1) * 86400_000)),
    );
    const results = await Promise.allSettled(days.map((d) => fetchHistoryFor(d)));
    let found: Record<string, number> = {};
    // Days are ordered from most-recent → oldest; pick the first non-empty.
    for (const r of results) {
      if (r.status === "fulfilled" && Object.keys(r.value).length > 0) {
        found = r.value;
        break;
      }
    }
    // Chỉ cache khi đã tìm được baseline. Nếu rỗng (timeout / upstream lỗi),
    // giữ `baseline = null` để request sau retry, tránh kẹt 0% cả ngày.
    if (Object.keys(found).length > 0) {
      baseline = { date: today, mids: found };
    } else {
      baseline = null;
    }
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

// =========================
// BTMC (Bảo Tín Minh Châu)
// =========================
// Public endpoint returns hundreds of price snapshots; each row has its
// columns suffixed with the row index (`@n_1`, `@pb_1`, `@ps_1`, `@d_1`...).
// Values are integer VND per chỉ (e.g. 15770000 = 15.77M VND/chỉ).
// We only keep the most recent snapshot of each distinct gold product, and
// only BTMC-branded products (skip silver, skip rows that mirror SJC/PNJ
// data already exposed via the PNJ feed).
interface BtmcRow {
  [k: string]: string;
}
interface BtmcResponse {
  DataList?: { Data?: BtmcRow[] };
}

// Maps an upstream BTMC product (name + karat) → our row spec.
// Keys are uppercased name. Items not listed are skipped.
const BTMC_MAP: Record<string, { id: string; brand: string; type: string }> = {
  "VÀNG MIẾNG VRTL": {
    id: "btmc-vrtl",
    brand: "Bảo Tín Minh Châu",
    type: "Vàng miếng Rồng Thăng Long",
  },
  "NHẪN TRÒN TRƠN": {
    id: "btmc-nhan",
    brand: "Bảo Tín Minh Châu",
    type: "Nhẫn tròn trơn 9999",
  },
  "TRANG SỨC VÀNG RỒNG THĂNG LONG 999.9": {
    id: "btmc-ts9999",
    brand: "Bảo Tín Minh Châu",
    type: "Trang sức RTL 999.9",
  },
  "TRANG SỨC VÀNG RỒNG THĂNG LONG 99.9": {
    id: "btmc-ts999",
    brand: "Bảo Tín Minh Châu",
    type: "Trang sức RTL 99.9",
  },
  "BẢN VÀNG ĐẮC LỘC": {
    id: "btmc-dacloc",
    brand: "Bảo Tín Minh Châu",
    type: "Bản vàng Đắc Lộc",
  },
  "QUÀ MỪNG BẢN VỊ VÀNG": {
    id: "btmc-quamung",
    brand: "Bảo Tín Minh Châu",
    type: "Quà mừng Bản vị vàng",
  },
};

async function fetchBtmcGold(): Promise<MappedItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(
      "https://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v",
      {
        headers: {
          Accept: "application/json",
          // Some upstream servers truncate gzip responses on long payloads.
          "Accept-Encoding": "identity",
        },
        signal: ctrl.signal,
      },
    );
    if (!res.ok) throw new Error(`BTMC source ${res.status}`);
    const json = (await res.json()) as BtmcResponse;
    const rows = json.DataList?.Data ?? [];
    // Walk rows newest-first; first occurrence per name wins.
    const seen = new Map<string, MappedItem>();
    for (let idx = 0; idx < rows.length; idx++) {
      const i = idx + 1;
      const row = rows[idx];
      const name = (row[`@n_${i}`] ?? "").trim();
      if (!name) continue;
      const upper = name.toUpperCase();
      // Skip silver entirely.
      if (upper.startsWith("BẠC")) continue;
      const spec = BTMC_MAP[upper];
      if (!spec) continue;
      if (seen.has(spec.id)) continue;
      const buy = parseFloat(row[`@pb_${i}`] ?? "0") || 0;
      let sell = parseFloat(row[`@ps_${i}`] ?? "0") || 0;
      if (!buy) continue;
      if (!sell) sell = buy; // some products have no sell side
      const updatedAt = parseVnDate(row[`@d_${i}`] ?? "");
      seen.set(spec.id, {
        ...spec,
        buy,
        sell,
        mid: midOf(buy, sell),
        unit: "VND/chỉ",
        updatedAt,
      });
    }
    return Array.from(seen.values());
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAllSources(): Promise<MappedItem[]> {
  // Fetch all sources in parallel; tolerate per-source failures so a single
  // bad upstream doesn't take the whole feed down.
  const [pnj, btmc] = await Promise.allSettled([
    fetchLiveGold(),
    fetchBtmcGold(),
  ]);
  const out: MappedItem[] = [];
  if (pnj.status === "fulfilled") out.push(...pnj.value);
  if (btmc.status === "fulfilled") out.push(...btmc.value);
  if (out.length === 0) {
    // Surface the original error if everything failed
    if (pnj.status === "rejected") throw pnj.reason;
    if (btmc.status === "rejected") throw btmc.reason;
  }
  // Dedupe by id (PNJ wins for shared products like SJC).
  const byId = new Map<string, MappedItem>();
  for (const it of out) if (!byId.has(it.id)) byId.set(it.id, it);
  return Array.from(byId.values());
}

function refreshInBackground() {
  if (inflight) return inflight;
  inflight = fetchAllSources()
    .then((items) => {
      cache = { at: Date.now(), data: items };
      writePriceCache("gold", items);
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
          // Cold start: hydrate from DB so the request doesn't block on
          // PNJ + BTMC upstream (3–6s combined). Subsequent SWR refresh
          // happens in the background.
          if (!cache) {
            const seed = await readPriceCache<MappedItem[]>("gold", CACHE_SWR_MS);
            if (seed) cache = { at: seed.updatedAt, data: seed.payload };
          }
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

          // Baseline (giá đóng cửa hôm qua) cần cho cột "% thay đổi 24h".
          // KHÔNG await trên cold-start: việc fetch 7 ngày history có thể tốn
          // 3–7s và làm trang chủ trễ hiển thị giá. Fire-and-forget — request
          // kế tiếp (sau ~vài giây) sẽ đã có baseline trong cache nguyên ngày.
          if (!baseline || baseline.date !== ymdVN(new Date())) {
            ensureBaseline().catch(() => {});
          }

          const mids = baseline?.mids ?? {};
          const out = items.map((g) => {
            const todayMid = g.mid; // đã ở đơn vị VND/chỉ
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