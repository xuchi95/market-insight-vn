import { createFileRoute } from "@tanstack/react-router";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";

/**
 * /api/public/widget-snapshot-large
 *
 * Endpoint dành cho widget kích thước LỚN (iOS systemLarge / Android 4x4+).
 * So với /widget-snapshot bản nhỏ:
 *   - Trả thêm nhiều tài sản: vàng SJC + DOJI + PNJ, BTC + ETH + SOL + BNB,
 *     USD/EUR/JPY/CNY, chỉ số VN-Index.
 *   - Mỗi mục crypto có thêm `spark24h` (mảng ~24 điểm giá 24h gần nhất)
 *     để widget vẽ sparkline trend.
 *
 * Payload vẫn cố gắng dưới ~4KB để tiết kiệm pin / data trên thiết bị.
 */

interface SparkPoint {
  t: number; // unix seconds
  p: number; // price
}

interface WidgetItemLarge {
  code: string;
  name: string;
  price: number;
  unit: string;
  changePct: number | null;
  spark24h?: SparkPoint[];
}

interface WidgetSnapshotLarge {
  updatedAt: string;
  groups: {
    gold: WidgetItemLarge[];
    crypto: WidgetItemLarge[];
    fx: WidgetItemLarge[];
    indices: WidgetItemLarge[];
  };
}

async function safeFetchJson(url: string, timeoutMs = 2500): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickGold(items: any[], nameRe: RegExp): WidgetItemLarge | null {
  const g = items.find((x) => nameRe.test(x.name ?? "")) ?? null;
  if (!g || typeof g.sellPrice !== "number") return null;
  return {
    code: (g.name ?? "").slice(0, 12),
    name: g.name ?? "",
    price: g.sellPrice,
    unit: "VND/lượng",
    changePct: typeof g.changePct === "number" ? g.changePct : null,
  };
}

/**
 * Lấy sparkline 24h cho 1 coin từ endpoint chart hiện có
 * (/api/public/crypto-chart?symbol=BTC&range=24h). Downsample còn ~24 điểm.
 */
async function fetchSpark(origin: string, symbol: string): Promise<SparkPoint[] | undefined> {
  const j = await safeFetchJson(
    `${origin}/api/public/crypto-chart?symbol=${symbol}&range=24h`,
    2000,
  );
  const raw: any[] | null = Array.isArray(j?.points)
    ? j.points
    : Array.isArray(j?.candles)
      ? j.candles
      : null;
  if (!raw || raw.length === 0) return undefined;

  // Chuẩn hoá: hỗ trợ {t,p}, {time,close}, [t, p]
  const normalized: SparkPoint[] = raw
    .map((r) => {
      if (Array.isArray(r) && r.length >= 2) {
        return { t: Number(r[0]), p: Number(r[1]) };
      }
      const t = Number(r.t ?? r.time ?? r.timestamp ?? 0);
      const p = Number(r.p ?? r.close ?? r.price ?? 0);
      return { t, p };
    })
    .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.p) && x.p > 0);

  if (normalized.length <= 24) return normalized;
  const step = normalized.length / 24;
  const out: SparkPoint[] = [];
  for (let i = 0; i < 24; i++) out.push(normalized[Math.floor(i * step)]);
  out.push(normalized[normalized.length - 1]);
  return out;
}

export const Route = createFileRoute("/api/public/widget-snapshot-large")({
  server: {
    handlers: {
      GET: async () => {
        let origin = "";
        try {
          const host = getRequestHost();
          const proto = getRequestHeader("x-forwarded-proto") ?? "https";
          if (host) origin = `${proto}://${host}`;
        } catch {
          /* no request context */
        }
        if (!origin) origin = "https://marketwatch.vn";

        const cryptoSymbols = ["BTC", "ETH", "SOL", "BNB"];

        const [gold, crypto, fx, stocks, ...sparks] = await Promise.all([
          safeFetchJson(`${origin}/api/public/gold`),
          safeFetchJson(`${origin}/api/public/crypto`),
          safeFetchJson(`${origin}/api/public/forex`),
          safeFetchJson(`${origin}/api/public/stocks`),
          ...cryptoSymbols.map((s) => fetchSpark(origin, s)),
        ]);

        // GOLD
        const goldOut: WidgetItemLarge[] = [];
        if (Array.isArray(gold?.items)) {
          for (const [code, re] of [
            ["SJC", /sjc/i],
            ["DOJI", /doji/i],
            ["PNJ", /pnj/i],
          ] as const) {
            const it = pickGold(gold.items, re);
            if (it) goldOut.push({ ...it, code });
          }
        }

        // CRYPTO
        const cryptoOut: WidgetItemLarge[] = [];
        if (Array.isArray(crypto?.coins)) {
          cryptoSymbols.forEach((sym, i) => {
            const c = crypto.coins.find(
              (x: any) => (x.symbol ?? "").toUpperCase() === sym,
            );
            if (!c || typeof c.price !== "number") return;
            cryptoOut.push({
              code: sym,
              name: c.name ?? sym,
              price: c.price,
              unit: "USD",
              changePct:
                typeof c.changePct24h === "number"
                  ? c.changePct24h
                  : typeof c.changePct === "number"
                    ? c.changePct
                    : null,
              spark24h: sparks[i] as SparkPoint[] | undefined,
            });
          });
        }

        // FX
        const fxOut: WidgetItemLarge[] = [];
        if (Array.isArray(fx?.rates)) {
          for (const code of ["USD", "EUR", "JPY", "CNY"]) {
            const r = fx.rates.find(
              (x: any) => (x.currencyCode ?? x.code ?? "").toUpperCase() === code,
            );
            const price = r?.sellPrice ?? r?.transfer ?? r?.rate;
            if (typeof price !== "number") continue;
            fxOut.push({
              code: `${code}/VND`,
              name:
                code === "USD"
                  ? "Đô la Mỹ"
                  : code === "EUR"
                    ? "Euro"
                    : code === "JPY"
                      ? "Yên Nhật"
                      : "Nhân dân tệ",
              price,
              unit: "VND",
              changePct: typeof r.changePct === "number" ? r.changePct : null,
            });
          }
        }

        // INDICES (VN-Index, HNX-Index nếu có)
        const indicesOut: WidgetItemLarge[] = [];
        if (Array.isArray(stocks?.indices)) {
          for (const code of ["VNINDEX", "HNXINDEX"]) {
            const s = stocks.indices.find(
              (x: any) =>
                (x.code ?? x.symbol ?? "").toUpperCase().replace(/[-_]/g, "") === code,
            );
            if (!s || typeof s.value !== "number") continue;
            indicesOut.push({
              code: code === "VNINDEX" ? "VN-Index" : "HNX-Index",
              name: code === "VNINDEX" ? "VN-Index" : "HNX-Index",
              price: s.value,
              unit: "điểm",
              changePct: typeof s.changePct === "number" ? s.changePct : null,
            });
          }
        }

        const snapshot: WidgetSnapshotLarge = {
          updatedAt: new Date().toISOString(),
          groups: {
            gold: goldOut,
            crypto: cryptoOut,
            fx: fxOut,
            indices: indicesOut,
          },
        };

        return new Response(JSON.stringify(snapshot), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=60, s-maxage=60",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});