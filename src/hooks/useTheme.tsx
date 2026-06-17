import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Mode = "light" | "dark" | "system";

type ThemeContext = {
  /** Theme thực sự đang áp dụng lên <html> ("light" hoặc "dark"). */
  theme: Theme;
  /** Lựa chọn của người dùng: "light", "dark" hoặc "system" (theo OS). */
  mode: Mode;
  /** Đặt lựa chọn theme. "system" sẽ xoá lưu trữ và đi theo OS. */
  setMode: (m: Mode) => void;
  /** Cycle nhanh dùng cho nút bấm: system → light → dark → system. */
  toggle: () => void;
};

const Ctx = createContext<ThemeContext>({
  theme: "dark",
  mode: "system",
  setMode: () => {},
  toggle: () => {},
});

function getSystemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): Mode {
  if (typeof window === "undefined") return "system";
  try {
    const s = localStorage.getItem("mw-theme");
    if (s === "light" || s === "dark") return s;
  } catch {}
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Mode = lựa chọn người dùng. Mặc định "system" khi chưa có lưu trữ.
  const [mode, setModeState] = useState<Mode>(() => readStoredMode());

  // Theme = giá trị đã giải quyết. Khởi tạo khớp DOM (bootstrap script đã set)
  // để tránh flash khi hydrate.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      if (document.documentElement.classList.contains("light")) return "light";
      if (document.documentElement.classList.contains("dark")) return "dark";
    }
    const m = readStoredMode();
    if (m === "light" || m === "dark") return m;
    return getSystemTheme();
  });

  // Đồng bộ DOM + localStorage khi mode thay đổi.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const resolved: Theme = mode === "system" ? getSystemTheme() : mode;
    setTheme(resolved);
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.classList.toggle("light", resolved === "light");
    try {
      if (mode === "system") localStorage.removeItem("mw-theme");
      else localStorage.setItem("mw-theme", mode);
    } catch {}
  }, [mode]);

  // Khi mode = "system", lắng nghe thay đổi từ OS/trình duyệt.
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved: Theme = e.matches ? "dark" : "light";
      setTheme(resolved);
      const root = document.documentElement;
      root.classList.toggle("dark", resolved === "dark");
      root.classList.toggle("light", resolved === "light");
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [mode]);

  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const toggle = useCallback(() => {
    setModeState((prev) => (prev === "system" ? "light" : prev === "light" ? "dark" : "system"));
  }, []);

  return <Ctx.Provider value={{ theme, mode, setMode, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);