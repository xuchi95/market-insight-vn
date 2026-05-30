import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, LogOut, Mail, Menu, PieChart, Search, Settings, Sparkles, User as UserIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

type NavItem = { label: string; to: string; hint?: string };
type NavColumn = { heading: string; items: NavItem[] };
type NavGroup = { label: string; columns: NavColumn[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Thị trường",
    columns: [
      {
        heading: "Tài sản",
        items: [
          { label: "Vàng", to: "/gia-vang", hint: "SJC, PNJ, DOJI" },
          { label: "Chứng khoán", to: "/chung-khoan", hint: "VN-Index, HOSE, HNX" },
          { label: "Tiền điện tử", to: "/tien-dien-tu", hint: "BTC, ETH, top 100" },
        ],
      },
      {
        heading: "Tỷ giá",
        items: [
          { label: "Ngoại tệ", to: "/ty-gia-ngoai-te", hint: "USD, EUR, JPY…" },
          { label: "Tỷ giá ngân hàng", to: "/ty-gia-ngan-hang", hint: "VCB, BIDV, TCB" },
          { label: "Quy đổi tiền tệ", to: "/quy-doi-tien-te", hint: "Đổi tiền nhanh" },
        ],
      },
    ],
  },
  {
    label: "Công cụ",
    columns: [
      {
        heading: "Đầu tư",
        items: [
          { label: "DCA & ROI", to: "/cong-cu/dca-roi", hint: "Tính lợi nhuận" },
          { label: "Danh mục", to: "/portfolio", hint: "Theo dõi tài sản" },
          { label: "Lãi suất tiết kiệm", to: "/lai-suat-tiet-kiem", hint: "So sánh ngân hàng" },
        ],
      },
      {
        heading: "Dữ liệu",
        items: [
          { label: "Lịch kinh tế", to: "/lich-kinh-te", hint: "Sự kiện vĩ mô" },
          { label: "Vĩ mô Việt Nam", to: "/vi-mo-viet-nam", hint: "GDP, CPI, lãi suất" },
        ],
      },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

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
        <div className="hidden md:flex items-center ml-6">
          <NavigationMenu>
            <NavigationMenuList className="gap-0.5">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to={HOME.to}
                    activeOptions={{ exact: true }}
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-[var(--gold)]"
                  >
                    {HOME.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {NAV_GROUPS.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors bg-transparent hover:bg-accent focus:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-6 p-4 w-[480px] bg-popover">
                      {group.columns.map((col) => (
                        <div key={col.heading} className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 px-2">
                            {col.heading}
                          </div>
                          <ul className="space-y-0.5">
                            {col.items.map((item) => (
                              <li key={item.to}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    to={item.to}
                                    activeOptions={{ exact: true }}
                                    className="group block rounded-md px-2 py-1.5 hover:bg-accent transition-colors data-[status=active]:bg-accent/60"
                                  >
                                    <div className="text-sm font-medium text-foreground group-hover:text-[var(--gold)] data-[status=active]:text-[var(--gold)] transition-colors">
                                      {item.label}
                                    </div>
                                    {item.hint && (
                                      <div className="text-xs text-muted-foreground/80 mt-0.5">
                                        {item.hint}
                                      </div>
                                    )}
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center">
            {searchOpen ? (
              <form
                className="relative animate-in fade-in slide-in-from-right-2 duration-200"
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
                  setSearchOpen(false);
                }}
              >
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }}
                  onBlur={() => { if (!q) setSearchOpen(false); }}
                  placeholder="BTC, SJC, USD…"
                  className="pl-8 w-52 h-9 rounded-full border border-border bg-card/60 text-sm focus-visible:ring-1 focus-visible:ring-[var(--gold)]/50"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Tìm kiếm"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>
          <span className="hidden xl:inline eyebrow opacity-50">{time}</span>
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden md:inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full border border-border bg-card/60 hover:border-[var(--gold)]/60 hover:bg-card transition-colors"
                  aria-label="Tài khoản"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-amber-700 text-background text-xs font-bold uppercase">
                    {(user.email ?? "?").slice(0, 1)}
                  </span>
                  <span className="text-sm max-w-[140px] truncate text-foreground/90">{user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/portfolio" })}>
                  <PieChart className="h-3.5 w-3.5 mr-2" /> Danh mục của tôi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/cai-dat" })}>
                  <Settings className="h-3.5 w-3.5 mr-2" /> Cài đặt tài khoản
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/cai-dat/ban-tin" })}>
                  <Mail className="h-3.5 w-3.5 mr-2" /> Quản lý bản tin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut().then(() => navigate({ to: "/" }))}>
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/dang-nhap"
                className="inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/dang-ky"
                className="inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-background bg-gradient-to-r from-[var(--gold)] to-amber-600 shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_40%,transparent),0_6px_18px_-6px_color-mix(in_oklab,var(--gold)_50%,transparent)] hover:shadow-[0_0_0_1px_var(--gold),0_8px_24px_-6px_color-mix(in_oklab,var(--gold)_70%,transparent)] transition-shadow"
              >
                Đăng ký
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
        <nav className="md:hidden border-t border-[var(--gold)]/20 bg-gradient-to-b from-card via-card to-background/95 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--gold)_15%,transparent),0_12px_30px_-12px_rgba(0,0,0,0.6)]">
          <div className="mx-auto max-w-6xl px-4 py-3 space-y-3">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground bg-accent/40 border border-border data-[status=active]:text-[var(--gold)] data-[status=active]:border-[var(--gold)]/40"
            >
              Tổng quan
            </Link>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 px-1">
                  {group.label}
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/40 p-1">
                  {group.columns.flatMap((col) => col.items).map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      activeOptions={{ exact: true }}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-2.5 py-1.5 text-sm text-foreground/90 hover:bg-accent data-[status=active]:bg-accent/70 data-[status=active]:text-[var(--gold)]"
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-3 mt-1 border-t border-border">
              {user ? (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-border bg-card/60 p-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-amber-700 text-background text-sm font-bold uppercase">
                      {(user.email ?? "?").slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Đã đăng nhập</div>
                      <div className="text-sm text-foreground truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={() => { setOpen(false); signOut().then(() => navigate({ to: "/" })); }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-3 w-3" /> Thoát
                    </button>
                  </div>
                  <Link
                    to="/cai-dat"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-3 w-3" /> Cài đặt tài khoản
                  </Link>
                  <Link
                    to="/cai-dat/ban-tin"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-3 w-3" /> Quản lý bản tin
                  </Link>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-[var(--gold)]/30 bg-gradient-to-br from-card via-card to-[color-mix(in_oklab,var(--gold)_10%,transparent)] p-4">
                  <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[var(--gold)]/15 blur-2xl" aria-hidden />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--gold)]">
                      <Sparkles className="h-3 w-3" /> Tham gia MarketWatch
                    </div>
                    <p className="mt-2 text-base text-foreground/90 leading-snug">
                      Đặt cảnh báo giá vàng & crypto, nhận email khi thị trường chạm ngưỡng.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        to="/dang-nhap"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-foreground hover:bg-background/70 transition-colors"
                      >
                        <UserIcon className="h-3 w-3" /> Đăng nhập
                      </Link>
                      <Link
                        to="/dang-ky"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--gold)] to-amber-600 px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-background shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--gold)_70%,transparent)]"
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
