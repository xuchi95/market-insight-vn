import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import { midOf } from "@/lib/gold-units";
import type { GoldPrice } from "./services/types";

// SSR-prime cho trang /gia-vang. Gọi `/api/public/gold` và `/api/public/xau`
// phía server (đã cache vào bảng `price_cache`, nên trả về ~50–150ms ngay cả
// khi Worker isolate cold-start). Hard 1.5s budget — nếu không lấy được thì
// trả null để client fallback sang fetch thông thường + skeleton.
export const getInitialGold = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoldPrice[] | null> => {
    let origin = "";
    try {
      const host = getRequestHost();
      const proto = getRequestHeader("x-forwarded-proto") ?? "https";
      if (host) origin = `${proto}://${host}`;
    } catch {
      /* no request context */
    }
    if (!origin) return null;

    const fetchJson = async (path: string): Promise<any> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      try {
        const r = await fetch(`${origin}${path}`, {
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
    };

    const [goldJson, xauJson] = await Promise.all([
      fetchJson("/api/public/gold"),
      fetchJson("/api/public/xau"),
    ]);

    const live: GoldPrice[] = Array.isArray(goldJson?.items)
      ? (goldJson.items as GoldPrice[])
      : [];

    let xauRow: GoldPrice | null = null;
    const price = Number(xauJson?.price);
    if (Number.isFinite(price) && price > 0) {
      const buy = Number.isFinite(Number(xauJson?.bid)) ? Number(xauJson.bid) : price;
      const sell = Number.isFinite(Number(xauJson?.ask)) ? Number(xauJson.ask) : price;
      xauRow = {
        id: "xauusd",
        brand: "Vàng thế giới",
        type: "XAU/USD (ounce)",
        buy,
        sell,
        mid: midOf(buy, sell),
        unit: xauJson?.unit ?? "USD/oz",
        changePct: Number(xauJson?.changePct) || 0,
        updatedAt:
          typeof xauJson?.updatedAt === "number" ? xauJson.updatedAt : Date.now(),
      };
    }

    const out = [...live, ...(xauRow ? [xauRow] : [])];
    return out.length > 0 ? out : null;
  },
);