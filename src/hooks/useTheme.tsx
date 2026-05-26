import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("mw-theme")) as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("mw-theme", theme); } catch {}
  }, [theme]);
  return <Ctx.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);