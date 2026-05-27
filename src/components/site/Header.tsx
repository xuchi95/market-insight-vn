import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, LogOut, Mail, Menu, Search, Sparkles, User as UserIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import logoUrl from "@/assets/logo.png";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      { label: "Vàng", to: "/gia-vang" },
      { label: "Chứng khoán", to: "/chung-khoan" },
      { label: "Crypto", to: "/tien-dien-tu" },
    ],
  },
  {
    label: "Ngoại tệ",
    items: [
      { label: "Ngoại tệ", to: "/ty-gia-ngoai-te" },
      { label: "Tỷ giá NH", to: "/ty-gia-ngan-hang" },
      { label: "Đổi tiền", to: "/quy-doi-tien-te" },
    ],
  },
  {
    label: "Công cụ",
    items: [
      { label: "DCA & ROI", to: "/cong-cu/dca-roi" },
      { label: "Lịch kinh tế", to: "/lich-kinh-te" },
      { label: "Danh mục", to: "/portfolio" },
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
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoUrl} alt="MarketWatch logo" className="h-8 w-8 object-contain" />
          <span className="font-display text-xl leading-none">
            <span className="text-[var(--gold)]">Market</span><span className="text-foreground">Watch</span>
          </span>
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
              if (/btc|eth|crypto|bitcoin/.test(term)) navigate({ to: "/tien-dien-tu" });
              else if (/sjc|xau|vàng|vang|gold/.test(term)) navigate({ to: "/gia-vang" });
              else if (/usd|eur|jpy|forex|ngoại|ngoai/.test(term)) navigate({ to: "/ty-gia-ngoai-te" });
              else if (/lãi|lai|ngân hàng|ngan hang|bank/.test(term)) navigate({ to: "/ty-gia-ngan-hang" });
              else if (/đổi|doi|convert/.test(term)) navigate({ to: "/quy-doi-tien-te" });
              else if (/vn-?index|hose|hnx|chứng|chung|stock/.test(term)) navigate({ to: "/chung-khoan" });
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
          <div className="hidden md:block h-5 w-px bg-border" aria-hidden />
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden md:inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full border border-border bg-card/60 hover:border-[var(--gold)]/60 hover:bg-card transition-colors"
                  aria-label="Tài khoản"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-amber-700 text-background text-[10px] font-bold uppercase">
                    {(user.email ?? "?").slice(0, 1)}
                  </span>
                  <span className="text-xs max-w-[120px] truncate text-foreground/90">{user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/cai-dat/ban-tin" })}>
                  <Mail className="h-3.5 w-3.5 mr-2" /> Quản lý bản tin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut().then(() => navigate({ to: "/" }))}>
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center rounded-full border border-border bg-card/50 p-0.5 backdrop-blur-sm">
              <Link
                to="/dang-nhap"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
              >
                <UserIcon className="h-3 w-3" /> Đăng nhập
              </Link>
              <Link
                to="/dang-ky"
                className="group relative inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-background bg-gradient-to-r from-[var(--gold)] to-amber-600 shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_40%,transparent),0_6px_18px_-6px_color-mix(in_oklab,var(--gold)_50%,transparent)] hover:shadow-[0_0_0_1px_var(--gold),0_8px_24px_-6px_color-mix(in_oklab,var(--gold)_70%,transparent)] transition-shadow"
              >
                <Sparkles className="h-3 w-3" /> Đăng ký
              </Link>
            </div>
          )}
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
            <div className="mt-3">
              {user ? (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-border bg-card/60 p-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-amber-700 text-background text-sm font-bold uppercase">
                      {(user.email ?? "?").slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Đã đăng nhập</div>
                      <div className="text-xs text-foreground truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={() => { setOpen(false); signOut().then(() => navigate({ to: "/" })); }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-3 w-3" /> Thoát
                    </button>
                  </div>
                  <Link
                    to="/cai-dat/ban-tin"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-3 w-3" /> Quản lý bản tin
                  </Link>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-[var(--gold)]/30 bg-gradient-to-br from-card via-card to-[color-mix(in_oklab,var(--gold)_10%,transparent)] p-4">
                  <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[var(--gold)]/15 blur-2xl" aria-hidden />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--gold)]">
                      <Sparkles className="h-3 w-3" /> Tham gia MarketWatch
                    </div>
                    <p className="mt-2 text-sm text-foreground/90 leading-snug">
                      Đặt cảnh báo giá vàng & crypto, nhận email khi thị trường chạm ngưỡng.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        to="/dang-nhap"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground hover:bg-background/70 transition-colors"
                      >
                        <UserIcon className="h-3 w-3" /> Đăng nhập
                      </Link>
                      <Link
                        to="/dang-ky"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--gold)] to-amber-600 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-background shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--gold)_70%,transparent)]"
                      >
                        Đăng ký <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
