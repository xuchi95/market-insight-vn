import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  /** Full TradingView symbol, e.g. "BINANCE:BTCUSDT" */
  symbol: string;
  /** Interval: 1, 5, 15, 60, 240, D, W */
  interval?: string;
  height?: number;
}

/**
 * TradingView Advanced Chart widget — realtime candles, indicators, drawing tools.
 * Uses TradingView's official embed script.
 */
export function TradingViewChart({ symbol, interval = "60", height = 520 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    container.innerHTML = `<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Asia/Ho_Chi_Minh",
      theme: theme === "dark" ? "dark" : "light",
      style: "1",
      locale: "vi_VN",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      withdateranges: true,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, interval, theme]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{ height, width: "100%" }}
    />
  );
}

/**
 * Map a coin symbol (BTC, ETH, ...) to a TradingView symbol on Binance.
 * Most major coins trade as <SYMBOL>USDT on Binance.
 */
export function toTradingViewCryptoSymbol(coinSymbol: string): string {
  const s = coinSymbol.toUpperCase();
  // Stablecoins / special mappings
  const SPECIAL: Record<string, string> = {
    USDT: "BINANCE:USDTUSD",
    USDC: "BINANCE:USDCUSDT",
    DAI: "BINANCE:DAIUSDT",
    WBTC: "BINANCE:WBTCUSDT",
  };
  if (SPECIAL[s]) return SPECIAL[s];
  return `BINANCE:${s}USDT`;
}