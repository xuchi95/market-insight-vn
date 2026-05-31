import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    if (!noFlash) {
      setFlash(to > from ? "up" : "down");
      const id = window.setTimeout(() => setFlash(null), 900);
      // Cleanup handled together with raf below
      var flashTimer = id;
    }

    if (duration <= 0 || !Number.isFinite(from) || !Number.isFinite(to)) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (to - from) * easeOutCubic(t);
      setDisplay(v);
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
      if (typeof flashTimer !== "undefined") clearTimeout(flashTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span
      className={cn(
        "tabular inline-block text-right transition-colors duration-300",
        flash === "up" && "text-[var(--up)]",
        flash === "down" && "text-[var(--down)]",
        className,
      )}
      style={minChars ? { minWidth: `${minChars}ch` } : undefined}
    >
      {format(display)}
    </span>
  );
}