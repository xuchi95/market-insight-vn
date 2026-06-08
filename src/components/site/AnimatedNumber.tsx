import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useMotionPref } from "@/hooks/useMotionPref";

interface Props {
  /** The current numeric value. */
  value: number;
  /** Formatter — receives the tweened number, returns the display string. */
  format: (n: number) => string;
  /** Tween duration in ms. Default 600. Set 0 to disable. */
  duration?: number;
  /** Min character width so the column doesn't reflow during tween. */
  minChars?: number;
  /** Extra classes (font color, weight, etc.). */
  className?: string;
  /** Disable the brief up/down color flash on change. */
  noFlash?: boolean;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Detect coarse-pointer / low-power devices once. On mobile the per-frame
// DOM writes of the number tween are the dominant jank source when many
// rows update at the same time — we keep the cheap background flash but
// snap the number to its final value.
const IS_COARSE_POINTER =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/**
 * Smoothly tweens a number between its previous and current value while
 * keeping column width stable via `tabular-nums` + an optional `min-w` hint.
 * Adds a subtle up/down color flash when the value changes.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 600,
  minChars,
  className,
  noFlash,
}: Props) {
  const { animate } = useMotionPref();
  // Skip the number tween on coarse-pointer devices (mobile/tablets) —
  // animating the bg via CSS is much cheaper than per-frame text writes.
  const effDuration = animate && !IS_COARSE_POINTER ? duration : 0;
  const effNoFlash = noFlash || !animate;
  const elRef = useRef<HTMLSpanElement | null>(null);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  // Skip flash/tween on the very first real value (e.g. when data resolves
  // from a skeleton). Without this every cell flashes on initial paint.
  const initializedRef = useRef(false);

  // Paint the initial value synchronously before the browser shows the cell.
  useLayoutEffect(() => {
    if (elRef.current) elRef.current.textContent = format(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const from = fromRef.current;
    const to = value;

    // First settle: just write the value, no flash, no tween.
    if (!initializedRef.current) {
      initializedRef.current = true;
      fromRef.current = to;
      el.textContent = format(to);
      return;
    }

    if (from === to) return;

    // Subtle color flash via CSS class (compositor-friendly).
    if (!effNoFlash) {
      el.classList.remove("price-flash-up", "price-flash-down");
      // Force reflow so the animation restarts on rapid consecutive changes.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetWidth;
      el.classList.add(to > from ? "price-flash-up" : "price-flash-down");
      if (flashTimerRef.current != null) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        el.classList.remove("price-flash-up", "price-flash-down");
      }, 750);
    }

    // Tween the number via direct DOM writes (no React re-render per frame).
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (effDuration <= 0 || !Number.isFinite(from) || !Number.isFinite(to)) {
      fromRef.current = to;
      el.textContent = format(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / effDuration);
      const v = from + (to - from) * easeOutCubic(t);
      el.textContent = format(v);
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

  // Unmount cleanup
  useEffect(() => () => {
    if (flashTimerRef.current != null) clearTimeout(flashTimerRef.current);
  }, []);

  // Re-render when the `format` function changes (e.g. user toggles
  // compact ↔ full). Skip while a tween is in-flight.
  useEffect(() => {
    if (!initializedRef.current) return;
    if (rafRef.current != null) return;
    if (elRef.current) elRef.current.textContent = format(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  return (
    <span
      ref={elRef}
      className={cn(
        "tabular inline-block -mx-1 rounded-md px-1 text-left",
        className,
      )}
      style={minChars ? { minWidth: `${minChars}ch` } : undefined}
    />
  );
}