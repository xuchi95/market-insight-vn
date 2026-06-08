import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  /** When false, price flash + tween animations are disabled globally. */
  animate: boolean;
  setAnimate: (v: boolean) => void;
  toggle: () => void;
};

const MotionPrefContext = createContext<Ctx>({
  animate: true,
  setAnimate: () => {},
  toggle: () => {},
});

const STORAGE_KEY = "mw-anim-prices";

export function MotionPrefProvider({ children }: { children: ReactNode }) {
  const [animate, setAnimateState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "0") setAnimateState(false);
      else if (raw === "1") setAnimateState(true);
      else if (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        // Honour OS-level reduce-motion when the user hasn't picked a preference.
        setAnimateState(false);
      }
    } catch {/* ignore */}
  }, []);

  const setAnimate = useCallback((v: boolean) => {
    setAnimateState(v);
    try { window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {/* ignore */}
  }, []);

  const value = useMemo<Ctx>(
    () => ({ animate, setAnimate, toggle: () => setAnimate(!animate) }),
    [animate, setAnimate],
  );

  return <MotionPrefContext.Provider value={value}>{children}</MotionPrefContext.Provider>;
}

export function useMotionPref() {
  return useContext(MotionPrefContext);
}