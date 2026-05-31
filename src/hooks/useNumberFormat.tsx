import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  /** When true, large numbers are abbreviated (1.2M, 230,2 tỷ…). */
  compact: boolean;
  setCompact: (v: boolean) => void;
  toggle: () => void;
};

const NumberFormatContext = createContext<Ctx>({
  compact: true,
  setCompact: () => {},
  toggle: () => {},
});

const STORAGE_KEY = "mw-num-compact";

export function NumberFormatProvider({ children }: { children: ReactNode }) {
  const [compact, setCompactState] = useState<boolean>(true);

  // Hydrate from localStorage on client.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "0") setCompactState(false);
      else if (raw === "1") setCompactState(true);
    } catch {/* ignore */}
  }, []);

  const setCompact = useCallback((v: boolean) => {
    setCompactState(v);
    try { window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {/* ignore */}
  }, []);

  const value = useMemo<Ctx>(
    () => ({ compact, setCompact, toggle: () => setCompact(!compact) }),
    [compact, setCompact],
  );

  return <NumberFormatContext.Provider value={value}>{children}</NumberFormatContext.Provider>;
}

export function useNumberFormat() {
  return useContext(NumberFormatContext);
}