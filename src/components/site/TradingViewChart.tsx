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
      hide_side_toolbar: isMobile,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      withdateranges: !isMobile,
      hide_volume: false,
      details: false,
      hotlist: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    // Liên tục gỡ mọi nhãn "tradingview-widget-copyright" mà script tự chèn vào.
    const stripBranding = () => {
      container.querySelectorAll(
        '.tradingview-widget-copyright, a[href*="tradingview.com"]',
      ).forEach((el) => {
        // chỉ gỡ phần copyright/branding bên ngoài iframe — không đụng chính iframe
        if (el.tagName !== "IFRAME") (el as HTMLElement).remove();
      });
    };
    const observer = new MutationObserver(stripBranding);
    observer.observe(container, { childList: true, subtree: true });
    stripBranding();

    return () => {
      observer.disconnect();
      container.innerHTML = "";
    };
  }, [symbol, interval, theme, isMobile, height, mobileHeight]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{
        height: isMobile ? mobileHeight : height,
        width: "100%",
        minHeight: isMobile ? mobileHeight : height,
        position: "relative",
      }}
    >
      {/* Brand overlay — che logo TradingView ở góc dưới trái và thay bằng MarketWatch */}
      <a
        href="https://marketwatch.vn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Made by MarketWatch.vn"
        className="absolute bottom-0 left-0 z-20 flex items-center gap-1 rounded-tr-md bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-[var(--gold)] transition-colors shadow-sm"
        style={{ pointerEvents: "auto", minWidth: 44, minHeight: 32 }}
      >
        <span className="opacity-70">Made by</span>
        <span className="font-semibold text-foreground">MarketWatch.vn</span>
      </a>
    </div>
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