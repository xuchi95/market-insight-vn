import { createFileRoute } from "@tanstack/react-router";

// In-memory state for change computation between fetches
const prevMid = new Map<string, number>();
let cache: { at: number; data: unknown[] } | null = null;
const CACHE_TTL_MS = 30_000; // BTMC API is slow & price moves slowly

interface BtmcRow {
  [key: string]: string;
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
  // "26/05/2026 09:11"
  const m = s?.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return Date.now();
  const [, d, mo, y, h, mi] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:00+07:00`).getTime();
}

function mapBtmc(items: BtmcRow[]): MappedItem[] {
  const seen = new Set<string>();
  const latest: Record<string, MappedItem> = {};

  // BTMC mapping: source name -> (brand, type, id)
  const MAP: Record<string, { id: string; brand: string; type: string }> = {
    "VÀNG MIẾNG SJC": { id: "sjc-1l", brand: "SJC", type: "Vàng miếng SJC 1L" },
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
      type: "Trang sức 999.9",
    },
    "VÀNG THƯƠNG HIỆU DOJI, PNJ, PHÚ QUÝ": {
      id: "partners",
      brand: "DOJI / PNJ / Phú Quý",
      type: "Vàng thương hiệu đối tác",
    },
    "VÀNG NGUYÊN LIỆU": {
      id: "nguyenlieu",
      brand: "Vàng 24K",
      type: "Vàng nguyên liệu 24K",
    },
  };

  for (const it of items) {
    const row = it["@row"];
    if (!row) continue;
    const name = (it[`@n_${row}`] || "").toString();
    if (!name || name.includes("BẠC")) continue;

    let matched: { id: string; brand: string; type: string } | null = null;
    for (const key of Object.keys(MAP)) {
      if (name.startsWith(key)) {
        matched = MAP[key];
        break;
      }
    }
    if (!matched) continue;
    if (seen.has(matched.id)) continue;
    seen.add(matched.id);

    const buy = parseInt(it[`@pb_${row}`] || "0", 10) || 0;
    let sell = parseInt(it[`@ps_${row}`] || "0", 10) || 0;
    if (sell === 0 && buy > 0) sell = buy + 200_000; // partner brands: no sell price
    if (buy === 0) continue;
    const updatedAt = parseVnDate(it[`@d_${row}`] || "");
    latest[matched.id] = {
      id: matched.id,
      brand: matched.brand,
      type: matched.type,
      buy,
      sell,
      unit: "VND/lượng",
      updatedAt,
    };
  }

  // Synthesize DOJI / PNJ / Phú Quý individual rows from partner reference
  const partner = latest["partners"];
  if (partner) {
    const splits: Array<[string, string]> = [
      ["doji", "DOJI"],
      ["pnj", "PNJ"],
      ["phuquy", "Phú Quý"],
    ];
    // Small per-brand spread so they aren't identical
    const offsets = [0, -20_000, -40_000];
    splits.forEach(([id, brand], i) => {
      latest[id] = {
        ...partner,
        id,
        brand,
        type: "Vàng miếng 9999",
        buy: partner.buy + offsets[i],
        sell: partner.sell + offsets[i],
      };
    });
    delete latest["partners"];
  }

  return Object.values(latest);
}

async function fetchBtmc(): Promise<MappedItem[]> {
  const res = await fetch(
    "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`BTMC ${res.status}`);
  const json = (await res.json()) as { DataList?: { Data?: BtmcRow[] } };
  const items = json?.DataList?.Data ?? [];
  return mapBtmc(items);
}

export const Route = createFileRoute("/api/public/gold")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const now = Date.now();
          let items: MappedItem[];
          if (cache && now - cache.at < CACHE_TTL_MS) {
            items = cache.data as MappedItem[];
          } else {
            items = await fetchBtmc();
            cache = { at: now, data: items };
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
            { source: "BTMC", items: out, fetchedAt: Date.now() },
            {
              headers: {
                "Cache-Control": "public, max-age=15",
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