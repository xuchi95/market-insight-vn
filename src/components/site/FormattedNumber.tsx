import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMotionPref } from "@/hooks/useMotionPref";

interface Props {
  /** Numeric value to render. */
  value: number;
  /** Formatter producing the display string (e.g. fmtTrieu, fmtUSD). */
  format: (n: number) => string;
  /** Optional unit suffix shown after the number, aligned to baseline. */
  unit?: string;
  /** Decimal separator used by `format`. Defaults to "," (vi-VN). */
  decimalSep?: string;
  /**
   * Reserve a fixed width for the decimal part so the decimal separator
   * always lines up vertically across rows. Number of fractional digits.
   * Default: inferred from the first rendered value.
   */
  decimals?: number;
  /** Tween duration in ms. Default 600. Set 0 to disable. */
  duration?: number;
  /** Disable the brief up/down color flash on change. */
  noFlash?: boolean;
  /** Optional class on the outer wrapper (sizing / weight / color). */
  className?: string;
  /** Optional class on the unit suffix. */
  unitClassName?: string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Shared number renderer for the site.
 *
 * Goals:
 * - `tabular-nums` so every digit has the same advance width.
 * - The decimal part is rendered in a fixed-width slot so the decimal
 *   separator lines up vertically across rows.
 * - Unit suffix (e.g. "tr/chỉ", "VND") is aligned to the **baseline** of
 *   the number — not its visual top — across font sizes.
 * - Smoothly tweens between values without reflowing the column width.
 *
 * Usage:
 *   <FormattedNumber value={sjc.sell} format={fmtTrieu} unit="tr/chỉ" decimals={2} />
 */
export function FormattedNumber({
  value,
  format,
  unit,
  decimalSep = ",",
  decimals,
  duration = 600,
  noFlash,
  className,
  unitClassName,
}: Props) {
  const { animate } = useMotionPref();
  const effDuration = animate ? duration : 0;
  const effNoFlash = noFlash || !animate;

  const intRef = useRef<HTMLSpanElement | null>(null);
  const fracRef = useRef<HTMLSpanElement | null>(null);
  const sepRef = useRef<HTMLSpanElement | null>(null);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const write = (n: number) => {
    const s = format(n);
    const idx = s.lastIndexOf(decimalSep);
    const intPart = idx >= 0 ? s.slice(0, idx) : s;
    const fracPart = idx >= 0 ? s.slice(idx + decimalSep.length) : "";
    if (intRef.current) intRef.current.textContent = intPart;
    if (sepRef.current) sepRef.current.textContent = fracPart ? decimalSep : "";
    if (fracRef.current) fracRef.current.textContent = fracPart;
  };

  // Paint initial synchronously to avoid a flash of empty content.
  useLayoutEffect(() => {
    write(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;

    if (!initializedRef.current) {
      initializedRef.current = true;
      fromRef.current = to;
      write(to);
      return;
    }
    if (from === to) return;

    if (!effNoFlash && intRef.current) {
      const el = intRef.current;
      el.classList.remove("price-flash-up", "price-flash-down");
      // force reflow so the animation restarts on rapid changes
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetWidth;
      el.classList.add(to > from ? "price-flash-up" : "price-flash-down");
      if (flashTimerRef.current != null) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        el.classList.remove("price-flash-up", "price-flash-down");
      }, 750);
    }

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (effDuration <= 0 || !Number.isFinite(from) || !Number.isFinite(to)) {
      fromRef.current = to;
      write(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / effDuration);
      const v = from + (to - from) * easeOutCubic(t);
      write(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, effDuration, effNoFlash]);

  useEffect(() => () => {
    if (flashTimerRef.current != null) clearTimeout(flashTimerRef.current);
  }, []);

  // Width reservation for fractional column so the decimal point aligns
  // across rows even when the number of decimals is 0/1/2.
  const fracWidth = decimals && decimals > 0 ? `${decimals}ch` : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-baseline tabular whitespace-nowrap",
        className,
      )}
    >
      <span ref={intRef} className="tabular rounded-md -mx-1 px-1 text-right" />
      <span ref={sepRef} className="tabular" />
      <span
        ref={fracRef}
        className="tabular text-left"
        style={fracWidth ? { minWidth: fracWidth, display: "inline-block" } : undefined}
      />
      {unit ? (
        <span
          className={cn(
            "ml-1.5 text-sm text-muted-foreground font-normal",
            unitClassName,
          )}
        >
          {unit}
        </span>
      ) : null}
    </span>
  );
}