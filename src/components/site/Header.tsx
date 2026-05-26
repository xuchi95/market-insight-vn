import { Link } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const NAV = [
  { label: "Tổng quan", to: "/" as const },
  { label: "Vàng", to: "/gold" as const },
  { label: "Crypto", to: "/crypto" as const },
  { label: "Ngoại tệ", to: "/forex" as const },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function Header({ onSearch }: { onSearch?: (q: string) => void }) {
  const time = useClock();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-baseline gap-4 px-5 py-4">
        <Link to="/" className="flex items-baseline gap-3 shrink-0">
          <span className="font-display text-2xl leading-none">
            <span className="text-[var(--gold)]">Market</span><span className="text-foreground">Watch</span>
          </span>
          <span className="hidden sm:inline eyebrow opacity-60">VN · Edition</span>
        </Link>

        <nav className="hidden md:flex items-baseline gap-6 ml-6">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-[var(--gold)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }}
              placeholder="BTC, SJC, USD…"
              className="pl-8 w-52 h-8 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent text-xs focus-visible:ring-0"
            />
          </div>
          <span className="hidden sm:inline eyebrow opacity-60">Hà Nội · {time}</span>
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Mở menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-5 py-3 grid gap-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                onClick={() => setOpen(false)}
                className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground data-[status=active]:text-[var(--gold)]"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}