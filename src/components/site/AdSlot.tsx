import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) || "";

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
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;
    // AdSense yêu cầu phần tử <ins> phải có width > 0 trước khi push.
    // Nếu không, console sẽ báo "availableWidth=0" và bỏ qua slot.
    const el = insRef.current;
    if (!el) return;

    let cancelled = false;
    const tryPush = () => {
      if (cancelled || pushed.current) return;
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return false;
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        /* noop */
      }
      return true;
    };

    if (tryPush()) return;

    const ro = new ResizeObserver(() => {
      if (tryPush()) ro.disconnect();
    });
    ro.observe(el);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [slot]);

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