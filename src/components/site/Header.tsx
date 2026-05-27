import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import logoUrl from "@/assets/logo.png";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

type NavItem = { label: string; to: string };
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Thị trường",
    items: [
      { label: "Vàng", to: "/gold" },
      { label: "Chứng khoán", to: "/stocks" },
      { label: "Crypto", to: "/crypto" },
    ],
  },
  {
    label: "Ngoại tệ",
    items: [
      { label: "Ngoại tệ", to: "/forex" },
      { label: "Tỷ giá NH", to: "/bank-rates" },
      { label: "Đổi tiền", to: "/converter" },
    ],
  },
];

const HOME: NavItem = { label: "Tổng quan", to: "/" };

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
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoUrl} alt="MarketWatch logo" className="h-8 w-8 object-contain" />
          <span className="font-display text-xl leading-none">
            <span className="text-[var(--gold)]">Market</span><span className="text-foreground">Watch</span>
          </span>
          <span className="hidden lg:inline eyebrow opacity-60 text-[10px]">VN · Edition</span>
        </Link>

        {/* Desktop NavigationMenu */}
        <div className="hidden md:flex items-center ml-4">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {/* Home standalone */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to={HOME.to}
                    activeOptions={{ exact: true }}
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-[var(--gold)]"
                  >
                    {HOME.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Dropdown groups */}
              {NAV_GROUPS.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors bg-transparent hover:bg-accent focus:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-48 gap-1 p-2 bg-popover border border-border rounded-md shadow-md">
                      {group.items.map((item) => (
                        <li key={item.to}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={item.to}
                              activeOptions={{ exact: true }}
                              className="block rounded-sm px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors data-[status=active]:text-[var(--gold)]"
                            >
                              {item.label}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <form
            className="relative hidden lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              const term = q.trim().toLowerCase();
              if (!term) return;
              onSearch?.(term);
              if (/btc|eth|crypto|bitcoin/.test(term)) navigate({ to: "/crypto" });
              else if (/sjc|xau|vàng|vang|gold/.test(term)) navigate({ to: "/gold" });
              else if (/usd|eur|jpy|forex|ngoại|ngoai/.test(term)) navigate({ to: "/forex" });
              else if (/lãi|lai|ngân hàng|ngan hang|bank/.test(term)) navigate({ to: "/bank-rates" });
              else if (/đổi|doi|convert/.test(term)) navigate({ to: "/converter" });
              else if (/vn-?index|hose|hnx|chứng|chung|stock/.test(term)) navigate({ to: "/stocks" });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }}
              placeholder="BTC, SJC, USD…"
              className="pl-8 w-44 h-8 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent text-xs focus-visible:ring-0"
            />
          </form>
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

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-5 py-3 grid gap-3">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
              className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground data-[status=active]:text-[var(--gold)]"
            >
              Tổng quan
            </Link>
            {NAV_GROUPS.flatMap((g) => g.items).map((n) => (
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
