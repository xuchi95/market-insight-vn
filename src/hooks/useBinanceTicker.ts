import { useEffect, useRef, useState } from "react";

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
  const [tick, setTick] = useState<BinanceTick | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setTick(null);
    if (!coinId) return;
    const sym = BINANCE_SYMBOL[coinId];
    if (!sym) return;
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return;

    let closed = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@ticker`);
      } catch {
        scheduleRetry();
        return;
      }
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data as string);
          const price = Number(m.c);
          if (!Number.isFinite(price)) return;
          setTick({
            priceUsd: price,
            change24h: Number(m.P) || 0,
            high24h: Number(m.h) || 0,
            low24h: Number(m.l) || 0,
            volume24h: Number(m.q) || 0,
            updatedAt: Number(m.E) || Date.now(),
          });
          retry = 0;
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
      ws.onclose = () => {
        if (closed) return;
        scheduleRetry();
      };
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
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [coinId]);

  return tick;
}