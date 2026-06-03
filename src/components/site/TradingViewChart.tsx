import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  /** Full TradingView symbol, e.g. "BINANCE:BTCUSDT" */
  symbol: string;
  /** Interval: 1, 5, 15, 60, 240, D, W */
  interval?: string;
  /** Desktop height (>= 768px). Default 640. */
  height?: number;
  /** Mobile height (< 768px). Default 460. */
  mobileHeight?: number;
}

/**
 * TradingView Advanced Chart widget — realtime candles, indicators, drawing tools.
 * Uses TradingView's official embed script.
 */
export function TradingViewChart({
  symbol,
  interval = "60",
  height = 760,
  mobileHeight = 520,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    const h = isMobile ? mobileHeight : height;
    container.innerHTML = `<div class="tradingview-widget-container__widget" style="height:${h}px;width:100%"></div>`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: false,
      width: "100%",
      height: h,
      symbol,
      interval,
      timezone: "Asia/Ho_Chi_Minh",
      theme: theme === "dark" ? "dark" : "light",
      style: "1",
      locale: "vi_VN",
      enable_publishing: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: true,
      allow_symbol_change: false,
      withdateranges: false,
      hide_volume: true,
      details: false,
      hotlist: false,
      calendar: false,
      save_image: false,
      studies: [],
      disabled_features: [
        "header_symbol_search",
        "header_compare",
        "header_screenshot",
        "header_saveload",
        "header_undo_redo",
        "header_settings",
        "header_fullscreen_button",
        "use_localstorage_for_settings",
        "timeframes_toolbar",
        "left_toolbar",
        "control_bar",
        "volume_force_overlay",
        "create_volume_indicator_by_default",
        "legend_widget",
        "display_market_status",
        "show_chart_property_page",
        "chart_property_page_background",
      ],
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, interval, theme, isMobile, height, mobileHeight]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{ height: isMobile ? mobileHeight : height, width: "100%", minHeight: isMobile ? mobileHeight : height }}
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