import { useCallback, useEffect, useState } from "react";

const KEY = "mw:compact-table-view";
const BP_PX: Record<"sm" | "md" | "lg", number> = { sm: 640, md: 768, lg: 1024 };

function read(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export function useCompactView() {
  const [compact, setCompactState] = useState<boolean>(true);
  const [vw, setVw] = useState<number>(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );

  useEffect(() => {
    setCompactState(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCompactState(read());
    };
    const onCustom = () => setCompactState(read());
    const onResize = () => setVw(window.innerWidth);
    setVw(window.innerWidth);
    window.addEventListener("storage", onStorage);
    window.addEventListener("mw:compact-view-change", onCustom);
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mw:compact-view-change", onCustom);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const setCompact = useCallback((next: boolean) => {
    setCompactState(next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
      window.dispatchEvent(new Event("mw:compact-view-change"));
    } catch {
      // ignore (private mode / quota)
    }
  }, []);

  const toggle = useCallback(() => setCompact(!compact), [compact, setCompact]);

  /**
   * Tailwind class for a column that is hidden on small screens in compact mode.
   * When compact = false, returns empty string so the column is always visible.
   */
  const colCls = useCallback(
    (bp: "sm" | "md" | "lg") => {
      if (!compact) return "";
      if (bp === "sm") return "hidden sm:table-cell";
      if (bp === "md") return "hidden md:table-cell";
      return "hidden lg:table-cell";
    },
    [compact],
  );

  /**
   * Whether a column at the given breakpoint is currently visible on screen.
   * In non-compact mode, all columns are visible. In compact mode, a column
   * is only visible when the viewport is at least the breakpoint width.
   * Use this to skip per-frame number tweens / flashes on cells the user
   * cannot see — reduces noise and saves work on mobile.
   */
  const isColVisible = useCallback(
    (bp: "sm" | "md" | "lg") => {
      if (!compact) return true;
      return vw >= BP_PX[bp];
    },
    [compact, vw],
  );

  return { compact, setCompact, toggle, colCls, isColVisible };
}