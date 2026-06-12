import { useCallback, useEffect, useState } from "react";

const KEY = "mw:compact-table-view";

function read(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export function useCompactView() {
  const [compact, setCompactState] = useState<boolean>(true);

  useEffect(() => {
    setCompactState(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCompactState(read());
    };
    const onCustom = () => setCompactState(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("mw:compact-view-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mw:compact-view-change", onCustom);
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

  return { compact, setCompact, toggle, colCls };
}