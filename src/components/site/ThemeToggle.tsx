import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { mode, theme, toggle } = useTheme();
  const label =
    mode === "system"
      ? `Giao diện theo hệ điều hành (đang ${theme === "dark" ? "tối" : "sáng"}) — bấm để chuyển sang Sáng`
      : mode === "light"
      ? "Giao diện Sáng — bấm để chuyển sang Tối"
      : "Giao diện Tối — bấm để theo hệ điều hành";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-[var(--gold)] hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]"
    >
      <Sun
        className={`h-4 w-4 absolute transition-all duration-300 ${
          mode === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
        }`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all duration-300 ${
          mode === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
        }`}
      />
      <Monitor
        className={`h-4 w-4 absolute transition-all duration-300 ${
          mode === "system" ? "opacity-100 rotate-0 scale-100" : "opacity-0 scale-75"
        }`}
      />
    </button>
  );
}