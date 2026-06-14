import { createFileRoute } from "@tanstack/react-router";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";

/**
 * /api/public/widget-snapshot
 *
 * Endpoint siêu gọn dành cho native widget (iOS WidgetKit / Android Glance)
 * gọi mỗi 15-30 phút. Trả về <1KB JSON với các giá MarketWatch quan trọng
 * nhất: vàng SJC, BTC, ETH, USD/VND, EUR/VND.
 *
 * Không yêu cầu auth — chỉ là số đọc công khai, đã có sẵn ở các endpoint
 * /api/public/gold, /crypto, /forex. Endpoint này chỉ tổng hợp + cắt gọn
 * để widget không phải parse cả response lớn trên thiết bị.
 */

interface WidgetItem {
  code: string;
  name: string;
  price: number;
  unit: string;
  changePct: number | null;
}

interface WidgetSnapshot {
  updatedAt: string;
  items: WidgetItem[];
}

async function safeFetchJson(url: string, timeoutMs = 2000): Promise<any> {
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

export const Route = createFileRoute("/api/public/widget-snapshot")({
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

        const [gold, crypto, fx] = await Promise.all([
          safeFetchJson(`${origin}/api/public/gold`),
          safeFetchJson(`${origin}/api/public/crypto`),
          safeFetchJson(`${origin}/api/public/forex`),
        ]);

        const items: WidgetItem[] = [];

        // Vàng SJC (lấy giá bán lẻ Hồ Chí Minh nếu có, fallback dòng đầu)
        if (Array.isArray(gold?.items)) {
          const sjc =
            gold.items.find(
              (g: any) =>
                /sjc/i.test(g.brand ?? "") &&
                /1l|miếng|mieng/i.test(g.type ?? ""),
            ) ??
            gold.items.find((g: any) => /sjc/i.test(g.brand ?? g.name ?? "")) ??
            gold.items[0];
          const sellPrice =
            typeof sjc?.sell === "number"
              ? sjc.sell
              : typeof sjc?.sellPrice === "number"
                ? sjc.sellPrice
                : null;
          if (sjc && sellPrice != null) {
            items.push({
              code: "SJC",
              name: "Vàng SJC",
              price: sellPrice,
              unit: sjc.unit ?? "VND/lượng",
              changePct:
                typeof sjc.changePct === "number" ? sjc.changePct : null,
            });
          }
        }

        // BTC + ETH
        if (Array.isArray(crypto?.coins)) {
          for (const sym of ["BTC", "ETH"]) {
            const c = crypto.coins.find(
              (x: any) => (x.symbol ?? "").toUpperCase() === sym,
            );
            const price =
              typeof c?.priceUsd === "number"
                ? c.priceUsd
                : typeof c?.price === "number"
                  ? c.price
                  : null;
            if (c && price != null) {
              items.push({
                code: sym,
                name: c.name ?? sym,
                price,
                unit: "USD",
                changePct:
                  typeof c.change24h === "number"
                    ? c.change24h
                    : typeof c.changePct24h === "number"
                    ? c.changePct24h
                    : typeof c.changePct === "number"
                      ? c.changePct
                      : null,
              });
            }
          }
        }

        // USD/VND + EUR/VND
        if (Array.isArray(fx?.rates)) {
          for (const code of ["USD", "EUR"]) {
            const r = fx.rates.find(
              (x: any) => (x.code ?? x.currencyCode ?? "").toUpperCase() === code,
            );
            const price =
              typeof r?.sell === "number"
                ? r.sell
                : typeof r?.mid === "number"
                  ? r.mid
                  : typeof r?.sellPrice === "number"
                    ? r.sellPrice
                    : typeof r?.transfer === "number"
                      ? r.transfer
                      : typeof r?.rate === "number"
                        ? r.rate
                        : null;
            if (r && price != null) {
              items.push({
                code: `${code}/VND`,
                name: code === "USD" ? "Đô la Mỹ" : "Euro",
                price,
                unit: "VND",
                changePct:
                  typeof r.changePct === "number" ? r.changePct : null,
              });
            }
          }
        }

        const snapshot: WidgetSnapshot = {
          updatedAt: new Date().toISOString(),
          items,
        };

        return new Response(JSON.stringify(snapshot), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            // Widget OS thường tự cache; cho phép CDN cache 60s để bảo vệ origin
            "cache-control": "public, max-age=60, s-maxage=60",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});