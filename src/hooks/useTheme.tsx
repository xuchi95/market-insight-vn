import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Khởi tạo từ class đã được bootstrap script set trên <html> (xem __root.tsx).
  // Fallback về localStorage, rồi "dark" — đảm bảo state khớp với DOM ngay từ render đầu,
  // tránh flash khi hydrate.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      if (document.documentElement.classList.contains("light")) return "light";
      if (document.documentElement.classList.contains("dark")) return "dark";
    }
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("mw-theme");
      if (s === "light" || s === "dark") return s;
    }
    return "dark";
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    try { localStorage.setItem("mw-theme", theme); } catch {}
  }, [theme]);
  return <Ctx.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);