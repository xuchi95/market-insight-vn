import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={isDark ? "Giao diện sáng" : "Giao diện tối"}
      className="relative hidden md:inline-flex h-8 w-14 items-center rounded-full border border-border bg-secondary/60 px-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]"
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-300 ${
          isDark ? "translate-x-0" : "translate-x-6"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-[var(--gold)]" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-[var(--gold)]" />
        )}
      </span>
      <Sun className={`ml-1 h-3 w-3 transition-opacity ${isDark ? "opacity-30" : "opacity-0"} text-muted-foreground`} />
      <Moon className={`ml-auto mr-1 h-3 w-3 transition-opacity ${isDark ? "opacity-0" : "opacity-30"} text-muted-foreground`} />
    </button>
  );
}