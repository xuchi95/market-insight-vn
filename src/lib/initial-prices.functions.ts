import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import type { CryptoCoin, ForexRate, GoldPrice } from "./services/types";

export interface InitialPrices {
  gold: GoldPrice[] | null;
  crypto: CryptoCoin[] | null;
  fx: ForexRate[] | null;
}

// SSR-prime the homepage tiles. Runs during render on the server, calling our
// own /api/public/* endpoints (which now hydrate from the persistent
// `price_cache` table, so they return in ~100ms even on a cold isolate).
// Hard 1.5s budget — if upstream is unreachable we ship null and let the
// client poll fall back to "Đang cập nhật giá…".
export const getInitialPrices = createServerFn({ method: "GET" }).handler(
  async (): Promise<InitialPrices> => {
    let origin = "";
    try {
      const host = getRequestHost();
      const proto = getRequestHeader("x-forwarded-proto") ?? "https";
      if (host) origin = `${proto}://${host}`;
    } catch {
      /* no request context — bail */
    }
    if (!origin) return { gold: null, crypto: null, fx: null };

    const fetchJson = async (path: string): Promise<any> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      try {
        const headers: Record<string, string> = { accept: "application/json" };
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (key) headers["x-internal-key"] = key;
        const r = await fetch(`${origin}${path}`, {
          headers,
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

    const [goldJson, cryptoJson, forexJson] = await Promise.all([
      fetchJson("/api/public/gold"),
      fetchJson("/api/public/crypto"),
      fetchJson("/api/public/forex"),
    ]);

    return {
      gold: Array.isArray(goldJson?.items) ? (goldJson.items as GoldPrice[]) : null,
      crypto: Array.isArray(cryptoJson?.coins)
        ? (cryptoJson.coins as CryptoCoin[])
        : null,
      fx: Array.isArray(forexJson?.rates) ? (forexJson.rates as ForexRate[]) : null,
    };
  },
);