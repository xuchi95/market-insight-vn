import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) || "";

/** Bắn analytics cho lifecycle của một ad slot.
 *  - `ad_view`: slot đã nằm trong viewport (≥ 50% trong ≥ 1s).
 *  - `ad_render`: AdSense đã render iframe có kích thước > 0 (fill).
 *  Gửi qua gtag/dataLayer nếu có, đồng thời dispatch CustomEvent
 *  `lovable:ad` trên window để các tracker khác có thể subscribe. */
function trackAdEvent(
  event: "ad_view" | "ad_render",
  payload: { slot: string; placement: Placement; format?: string },
) {
  if (typeof window === "undefined") return;
  try {
    const detail = { event, ...payload, ts: Date.now() };
    window.dispatchEvent(new CustomEvent("lovable:ad", { detail }));
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
  const pushed = useRef(false);
  const viewed = useRef(false);
  const rendered = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;
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
        // AdSense set data-ad-status="filled" khi render thành công,
        // hoặc "unfilled" khi không có ad. Coi cả 2 đều là đã "render".
        const hasIframe = !!el.querySelector("iframe");
        if ((status === "filled" || hasIframe) && rect.height > 1) {
          rendered.current = true;
          trackAdEvent("ad_render", { slot, placement, format });
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

    // Theo dõi "viewable impression": ≥50% trong ≥1s (gần với chuẩn IAB).
    const watchView = () => {
      if (viewed.current) return;
      viewIo = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.intersectionRatio >= 0.5) {
              if (viewTimer) continue;
              viewTimer = setTimeout(() => {
                if (cancelled || viewed.current) return;
                viewed.current = true;
                trackAdEvent("ad_view", { slot, placement, format });
                viewIo?.disconnect();
              }, 1000);
            } else if (viewTimer) {
              clearTimeout(viewTimer);
              viewTimer = null;
            }
          }
        },
        { threshold: [0, 0.5, 1] },
      );
      viewIo.observe(frame);
    };

    const tryPush = () => {
      if (cancelled || pushed.current) return false;
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return false;
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        /* noop */
      }
      watchRender();
      watchView();
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
    };
  }, [slot, placement, format]);

  // No client configured AND no manually-pasted unit → render nothing
  // (don't reserve space, don't show empty box).
  if (!CLIENT && !children) return null;

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
            data-full-width-responsive="true"
          />
        ) : null}
      </div>
    </aside>
  );
}