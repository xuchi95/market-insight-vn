import { useEffect, useMemo, useRef, useState } from "react";

// Throttle UI updates from the WS stream. Binance pushes ~1 frame/sec but
// we only need a "near-realtime" feel on the asset page — flushing every
// 10s keeps the UI smooth and battery-friendly while still showing live
// price/change movement.
const UI_FLUSH_MS = 10_000;

// CoinGecko id -> Binance USDT spot pair. Must mirror server map in
// src/routes/api/public/crypto.ts (BINANCE_SYMBOL). Coins absent here will
// fall back to the REST snapshot from /api/public/crypto.
const BINANCE_SYMBOL: Record<string, string> = {
  bitcoin: "btcusdt",
  ethereum: "ethusdt",
  binancecoin: "bnbusdt",
  solana: "solusdt",
  ripple: "xrpusdt",
  dogecoin: "dogeusdt",
  "the-open-network": "tonusdt",
  cardano: "adausdt",
  "avalanche-2": "avaxusdt",
  tron: "trxusdt",
  chainlink: "linkusdt",
  polkadot: "dotusdt",
  "polygon-ecosystem-token": "polusdt",
  "shiba-inu": "shibusdt",
  litecoin: "ltcusdt",
  "bitcoin-cash": "bchusdt",
  uniswap: "uniusdt",
  stellar: "xlmusdt",
  near: "nearusdt",
  "internet-computer": "icpusdt",
  aptos: "aptusdt",
  cosmos: "atomusdt",
  "ethereum-classic": "etcusdt",
  filecoin: "filusdt",
  "hedera-hashgraph": "hbarusdt",
  arbitrum: "arbusdt",
  vechain: "vetusdt",
  maker: "mkrusdt",
  "render-token": "renderusdt",
  "injective-protocol": "injusdt",
  optimism: "opusdt",
  sui: "suiusdt",
  pepe: "pepeusdt",
  "wrapped-bitcoin": "wbtcusdt",
  kaspa: "kasusdt",
};

export interface BinanceTick {
  priceUsd: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: number;
}

/**
 * Open a Binance public 24hr ticker stream for a CoinGecko coin id.
 * Returns the latest tick (~1s cadence) or `null` if the coin has no Binance
 * pair or the socket cannot connect.
 */
export function useBinanceTicker(coinId: string | undefined | null): BinanceTick | null {
  const ids = useMemo(() => (coinId ? [coinId] : []), [coinId]);
  const ticks = useBinanceTickers(ids);
  return coinId ? ticks[coinId] ?? null : null;
}

/**
 * Subscribe to Binance combined stream for many coin ids at once.
 * Returns a map of coinId -> latest tick. UI updates throttled to ~10s
 * via `UI_FLUSH_MS` to match the table cadence and reduce re-renders.
 */
export function useBinanceTickers(coinIds: string[]): Record<string, BinanceTick> {
  const [ticks, setTicks] = useState<Record<string, BinanceTick>>({});
  const pendingRef = useRef<Record<string, BinanceTick>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushRef = useRef(0);

  // Stable key from sorted ids that have a Binance pair
  const coinIdsKey = coinIds.join("|");
  const pairs = useMemo(() => {
    const seen = new Set<string>();
    return coinIds
      .filter((id) => {
        if (!BINANCE_SYMBOL[id] || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => [id, BINANCE_SYMBOL[id]] as const);
  }, [coinIdsKey]);
  const key = useMemo(() => pairs.map(([id]) => id).sort().join(","), [pairs]);

  useEffect(() => {
    if (!key) {
      setTicks({});
      return;
    }
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return;

    const idBySym: Record<string, string> = {};
    const streams: string[] = [];
    for (const [id, sym] of pairs) {
      idBySym[sym!] = id;
      streams.push(`${sym}@ticker`);
    }

    let closed = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let ws: WebSocket | null = null;

    const flush = () => {
      flushTimerRef.current = null;
      if (closed) return;
      const next = pendingRef.current;
      if (!Object.keys(next).length) return;
      pendingRef.current = {};
      lastFlushRef.current = Date.now();
      setTicks((prev) => ({ ...prev, ...next }));
    };

    const schedule = () => {
      const now = Date.now();
      const elapsed = now - lastFlushRef.current;
      if (elapsed >= UI_FLUSH_MS) { flush(); return; }
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(flush, UI_FLUSH_MS - elapsed);
    };

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams.join("/")}`);
      } catch { scheduleRetry(); return; }
      ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(ev.data as string);
          const m = frame?.data ?? frame;
          const sym = String(m?.s ?? "").toLowerCase();
          const id = idBySym[sym];
          if (!id) return;
          const price = Number(m.c);
          if (!Number.isFinite(price)) return;
          pendingRef.current[id] = {
            priceUsd: price,
            change24h: Number(m.P) || 0,
            high24h: Number(m.h) || 0,
            low24h: Number(m.l) || 0,
            volume24h: Number(m.q) || 0,
            updatedAt: Number(m.E) || Date.now(),
          };
          schedule();
          retry = 0;
        } catch { /* ignore */ }
      };
      ws.onerror = () => { try { ws?.close(); } catch {} };
      ws.onclose = () => { if (!closed) scheduleRetry(); };
    };

    const scheduleRetry = () => {
      if (closed) return;
      const delay = Math.min(15_000, 1_000 * 2 ** Math.min(retry, 4));
      retry += 1;
      retryTimer = setTimeout(connect, delay);
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
      pendingRef.current = {};
      lastFlushRef.current = 0;
      try { ws?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ticks;
}