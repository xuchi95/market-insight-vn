import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { trackAd } from "@/lib/analytics/tracker";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) || "";

/** Bật AdSense "test mode" (data-adtest="on") khi:
 *  - `VITE_ADSENSE_TEST=on` (override thủ công), HOẶC
 *  - đang chạy ở dev (`import.meta.env.DEV`), HOẶC
 *  - hostname không phải production (localhost, *.lovable.app preview, IP).
 *  Test mode cho phép render ad placeholder để verify layout mà KHÔNG tính
 *  impression/CTR thật → không vi phạm chính sách AdSense. */
const TEST_ENV_FLAG =
  String(import.meta.env.VITE_ADSENSE_TEST ?? "").toLowerCase() === "on";
const PROD_HOSTS = new Set([
  "marketwatch.vn",
  "www.marketwatch.vn",
  "market-insight-vn.lovable.app",
]);
function detectTestMode(): boolean {
  if (TEST_ENV_FLAG) return true;
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (!host) return false;
  if (PROD_HOSTS.has(host)) return false;
  // Bất kỳ preview/staging/localhost nào → test mode.
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".lovable.app") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  );
}

/** Bắn analytics cho lifecycle của một ad slot.
 *  - `ad_request`: đã push lệnh tải ad (mẫu số của fill rate).
 *  - `ad_render`: AdSense trả về `data-ad-status="filled"` (đã fill thật).
 *  - `ad_view`: viewable impression theo IAB MRC — ≥50% pixel hiển thị
 *    trong ≥1s liên tục KHI tab đang visible.
 *  - `ad_click`: heuristic khi window mất focus và activeElement là iframe
 *    quảng cáo nằm trong slot.
 *  Không bắn bất kỳ sự kiện nào ở testMode để giữ thống kê sạch. */
function trackAdEvent(
  event: "ad_view" | "ad_render" | "ad_request" | "ad_click",
  payload: { slot: string; placement: Placement; format?: string },
) {
  if (typeof window === "undefined") return;
  try {
    const detail = { event, ...payload, ts: Date.now() };
    window.dispatchEvent(new CustomEvent("lovable:ad", { detail }));
    // Gửi về backend analytics_events (tự gating bằng consent + DNT).
    trackAd(event as "ad_view" | "ad_render" | "ad_click", payload);
    if (typeof window.gtag === "function") {
      window.gtag("event", event, {
        ad_slot: payload.slot,
        ad_placement: payload.placement,
        ad_format: payload.format,
      });
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event,
        ad_slot: payload.slot,
        ad_placement: payload.placement,
        ad_format: payload.format,
      });
    }
  } catch {
    /* noop */
  }
}

type Placement = "header" | "in-article" | "footer" | "sidebar";

interface AdSlotProps {
  /** AdSense data-ad-slot id. If omitted and `children` is empty, the slot stays empty
   *  (still reserves space so layout never shifts). */
  slot?: string;
  placement?: Placement;
  format?: "auto" | "fluid" | "horizontal" | "rectangle";
  layout?: string; // for in-article fluid units
  /** Optional raw AdSense unit code (e.g. pasted from AdSense console). */
  children?: ReactNode;
  className?: string;
  /** Override the reserved min-height (px). */
  minHeight?: number;
  /** Hide the small "Quảng cáo" label above the slot. */
  hideLabel?: boolean;
}

const DEFAULT_MIN_H: Record<Placement, number> = {
  header: 90,       // leaderboard / mobile banner
  "in-article": 250, // medium rectangle / fluid in-article
  footer: 90,
  sidebar: 250,
};

/** Reserved height responsive theo breakpoint, dùng làn CSS clamp-like
 *  để tránh CLS khi AdSense thay iframe nhiều kích thước (mobile banner
 *  ~100px → leaderboard 90px desktop; medium rectangle 250–280px). */
const RESPONSIVE_MIN_H: Record<Placement, { base: number; md: number; lg: number }> = {
  header:       { base: 100, md: 90,  lg: 90  },
  "in-article": { base: 280, md: 250, lg: 250 },
  footer:       { base: 100, md: 90,  lg: 90  },
  sidebar:      { base: 250, md: 600, lg: 600 },
};

/**
 * Khung quảng cáo dùng chung cho mọi trang.
 *
 * - Đặt sẵn chiều cao tối thiểu để KHÔNG gây CLS khi AdSense nạp ads.
 * - Tự load `adsbygoogle.js` khi có `VITE_ADSENSE_CLIENT`.
 * - Nếu chưa cấu hình client, slot ẩn hoàn toàn (không chiếm chỗ).
 * - Có thể truyền `slot` để render `<ins class="adsbygoogle" />` mặc định,
 *   hoặc truyền `children` là code AdSense paste trực tiếp từ console.
 */
export function AdSlot({
  slot,
  placement = "in-article",
  format = "auto",
  layout,
  children,
  className,
  minHeight,
  hideLabel,
}: AdSlotProps) {
  const { prefs, decided } = useCookieConsent();
  // Tính test mode sau khi mount để tránh hydration mismatch (SSR không biết
  // hostname). Default = false ⇒ SSR markup khớp với production host.
  const [testMode, setTestMode] = useState<boolean>(TEST_ENV_FLAG || import.meta.env.DEV);
  useEffect(() => {
    setTestMode(detectTestMode());
  }, []);
  // AdSense yêu cầu đồng ý nhóm "marketing"; tracking sự kiện ad_view /
  // ad_render thuộc nhóm "analytics". Ở testMode KHÔNG bắn analytics để
  // tránh làm sai impression/CTR thật.
  const adsAllowed = decided && prefs.marketing;
  const analyticsAllowed = decided && prefs.analytics && !testMode;
  const pushed = useRef(false);
  const viewed = useRef(false);
  const rendered = useRef(false);
  const clicked = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current || !adsAllowed) return;
    const el = insRef.current;
    const frame = frameRef.current;
    if (!el || !frame) return;

    // AdSense yêu cầu <ins> có width > 0 trước khi push. Đồng thời để
    // tránh CLS + tiết kiệm request, chỉ push khi slot sắp vào viewport.
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let viewIo: IntersectionObserver | null = null;
    let viewTimer: ReturnType<typeof setTimeout> | null = null;
    let renderRo: ResizeObserver | null = null;

    const watchRender = () => {
      if (rendered.current) return;
      const check = () => {
        if (rendered.current) return true;
        const status = el.getAttribute("data-ad-status");
        const rect = el.getBoundingClientRect();
        // CHỈ tính fill khi AdSense xác nhận "filled" + có iframe + height>1.
        // Bỏ "unfilled" để fill rate (render/request) chính xác.
        const hasIframe = !!el.querySelector("iframe");
        if (status === "filled" && hasIframe && rect.height > 1) {
          rendered.current = true;
          if (analyticsAllowed) {
            trackAdEvent("ad_render", { slot, placement, format });
          }
          renderRo?.disconnect();
          return true;
        }
        return false;
      };
      if (check()) return;
      renderRo = new ResizeObserver(() => {
        check();
      });
      renderRo.observe(el);
    };

    // IAB MRC viewable impression: ≥50% pixel hiển thị trong ≥1s liên tục
    // KHI tab visible. Tab ẩn / cuộn ra khỏi viewport ⇒ reset timer.
    const watchView = () => {
      if (viewed.current) return;
      const fireIfReady = (visible: boolean) => {
        if (viewed.current) return;
        if (!visible || document.visibilityState !== "visible") {
          if (viewTimer) { clearTimeout(viewTimer); viewTimer = null; }
          return;
        }
        if (viewTimer) return;
        viewTimer = setTimeout(() => {
          if (cancelled || viewed.current) return;
          viewed.current = true;
          trackAdEvent("ad_view", { slot, placement, format });
          viewIo?.disconnect();
          document.removeEventListener("visibilitychange", onVis);
        }, 1000);
      };
      let lastVisible = false;
      const onVis = () => fireIfReady(lastVisible);
      document.addEventListener("visibilitychange", onVis);
      viewIo = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            lastVisible = entry.intersectionRatio >= 0.5;
            fireIfReady(lastVisible);
          }
        },
        { threshold: [0, 0.5, 1] },
      );
      viewIo.observe(frame);
    };

    // Heuristic đếm click: AdSense iframe cross-origin nên không nghe trực
    // tiếp được click. Khi window mất focus và activeElement là iframe nằm
    // trong slot → người dùng vừa click ad. Chuẩn ngành (GA4, Quantcast).
    const onBlur = () => {
      if (clicked.current) return;
      // Dùng timeout 0 để document.activeElement cập nhật xong.
      setTimeout(() => {
        if (clicked.current || cancelled) return;
        const active = document.activeElement;
        if (!active || active.tagName !== "IFRAME") return;
        if (!frame.contains(active)) return;
        clicked.current = true;
        if (analyticsAllowed) trackAdEvent("ad_click", { slot, placement, format });
        window.removeEventListener("blur", onBlur);
      }, 0);
    };
    if (analyticsAllowed) window.addEventListener("blur", onBlur);

    const tryPush = () => {
      if (cancelled || pushed.current) return false;
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return false;
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        if (analyticsAllowed) trackAdEvent("ad_request", { slot, placement, format });
      } catch {
        /* noop */
      }
      watchRender();
      if (analyticsAllowed) watchView();
      ro?.disconnect();
      io?.disconnect();
      return true;
    };

    const startWidthWatch = () => {
      if (tryPush()) return;
      ro = new ResizeObserver(() => {
        tryPush();
      });
      ro.observe(el);
    };

    // Nếu trình duyệt không hỗ trợ IO → fallback push ngay.
    if (typeof IntersectionObserver === "undefined") {
      startWidthWatch();
      return () => {
        cancelled = true;
        ro?.disconnect();
      };
    }

    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io?.disconnect();
            startWidthWatch();
            break;
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    io.observe(frame);

    return () => {
      cancelled = true;
      ro?.disconnect();
      io?.disconnect();
      viewIo?.disconnect();
      renderRo?.disconnect();
      if (viewTimer) clearTimeout(viewTimer);
      window.removeEventListener("blur", onBlur);
    };
  }, [slot, placement, format, adsAllowed, analyticsAllowed]);

  // No client configured AND no manually-pasted unit → render nothing
  // (don't reserve space, don't show empty box).
  if (!CLIENT && !children) return null;
  // Chưa có quyết định cookie hoặc người dùng từ chối nhóm marketing →
  // không render slot AdSense / raw unit và không reserve khoảng trống.
  if (!adsAllowed) return null;

  const reserved = minHeight ?? DEFAULT_MIN_H[placement];
  const responsive = RESPONSIVE_MIN_H[placement];
  // CSS custom prop cho phép set min-height tăng dần theo breakpoint
  // (xem rule trong src/styles.css). Khi caller truyền minHeight tay,
  // dùng cùng giá trị cho cả 3 breakpoint để giữ tương thích.
  const cssVars = {
    "--ad-min-h":    `${minHeight ?? responsive.base}px`,
    "--ad-min-h-md": `${minHeight ?? responsive.md}px`,
    "--ad-min-h-lg": `${minHeight ?? responsive.lg}px`,
  } as React.CSSProperties;

  return (
    <aside
      role="complementary"
      aria-label="Quảng cáo"
      className={cn(
        "mx-auto w-full min-w-0 max-w-6xl px-4 md:px-5 lg:px-6 my-6 md:my-8 overflow-hidden",
        className,
      )}
      style={cssVars}
    >
      {!hideLabel && (
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
          Quảng cáo
        </div>
      )}
      <div
        ref={frameRef}
        className="ad-slot-frame relative w-full min-w-0 overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/20"
        style={{ minHeight: reserved }}
      >
        {children ? (
          // Raw AdSense unit pasted by the user
          <div className="flex w-full min-w-0 items-center justify-center overflow-hidden [&_ins]:!block [&_ins]:!w-full [&_ins]:!max-w-full [&_iframe]:!max-w-full">
            {children}
          </div>
        ) : slot && CLIENT ? (
          <ins
            ref={insRef}
            className="adsbygoogle ad-slot-ins"
            style={{ display: "block", width: "100%", maxWidth: "100%", minHeight: reserved, overflow: "hidden" }}
            data-ad-client={CLIENT}
            data-ad-slot={slot}
            data-ad-format={format}
            {...(layout ? { "data-ad-layout": layout } : {})}
            {...(testMode ? { "data-adtest": "on" } : {})}
            data-full-width-responsive="true"
          />
        ) : null}
      </div>
    </aside>
  );
}