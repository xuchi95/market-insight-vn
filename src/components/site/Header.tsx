import { Link } from "@tanstack/react-router";
import { Coins, LineChart, Moon, Newspaper, Search, Sun, Wrench } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Giá vàng", href: "#gold" },
  { label: "Crypto", href: "#crypto" },
  { label: "Ngoại tệ", href: "#forex" },
  { label: "Biểu đồ", href: "#chart" },
  { label: "Công cụ", href: "#converter" },
  { label: "Tin tức", href: "#news" },
];

export function Header({ onSearch }: { onSearch?: (q: string) => void }) {
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient text-gold-foreground shadow-sm">
            <Coins className="h-5 w-5" />
          </div>
          <div className="font-bold text-lg tracking-tight">
            Market<span className="text-gold">Watch</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }}
              placeholder="Tìm BTC, SJC, USD..."
              className="pl-9 w-56 h-9 bg-muted/40"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Đổi giao diện">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}