import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={isDark}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-[var(--gold)] hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]"
    >
      <Sun
        className={`h-4 w-4 absolute transition-all duration-300 ${
          isDark ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all duration-300 ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
        }`}
      />
    </button>
  );
}