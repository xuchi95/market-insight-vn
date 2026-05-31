import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, LogOut, Mail, Menu, PieChart, Search, Settings, Sparkles, Star, User as UserIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import logoUrl from "@/assets/logo.png";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import { NumberFormatToggle } from "@/components/site/NumberFormatToggle";
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
          { label: "Quy đổi tiền tệ", to: "/quy-doi-tien-te", hint: "Đổi tiền nhanh" },
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

type SearchSuggestion = {
  symbol: string;
  label: string;
  category: string;
  to: string;
  keywords: string[];
};

const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { symbol: "BTC", label: "Bitcoin", category: "Tiền điện tử", to: "/tai-san/btc", keywords: ["btc", "bitcoin", "crypto"] },
  { symbol: "ETH", label: "Ethereum", category: "Tiền điện tử", to: "/tai-san/eth", keywords: ["eth", "ethereum", "crypto"] },
  { symbol: "SOL", label: "Solana", category: "Tiền điện tử", to: "/tai-san/sol", keywords: ["sol", "solana", "crypto"] },
  { symbol: "SJC", label: "Vàng miếng SJC 1L", category: "Vàng", to: "/tai-san/gold-sjc-1l", keywords: ["sjc", "vang", "vàng", "gold"] },
  { symbol: "XAU", label: "Vàng thế giới (XAU/USD)", category: "Vàng", to: "/tai-san/gold-xauusd", keywords: ["xau", "gold", "vàng thế giới"] },
  { symbol: "PNJ", label: "Vàng PNJ", category: "Vàng", to: "/tai-san/gold-pnj", keywords: ["pnj", "vang", "vàng"] },
  { symbol: "USD", label: "Đô la Mỹ (USD/VND)", category: "Ngoại tệ", to: "/tai-san/usd", keywords: ["usd", "dollar", "đô"] },
  { symbol: "EUR", label: "Euro (EUR/VND)", category: "Ngoại tệ", to: "/tai-san/eur", keywords: ["eur", "euro"] },
  { symbol: "JPY", label: "Yên Nhật (JPY/VND)", category: "Ngoại tệ", to: "/tai-san/jpy", keywords: ["jpy", "yen", "yên"] },
  { symbol: "VCB·USD", label: "Vietcombank · USD/VND", category: "Ngân hàng", to: "/tai-san/bank-usd", keywords: ["vcb", "vietcombank", "ngân hàng", "usd"] },
  { symbol: "VN-Index", label: "Chỉ số VN-Index", category: "Chứng khoán", to: "/tai-san/vnindex", keywords: ["vnindex", "vn-index", "hose", "chứng khoán"] },
  { symbol: "DCA", label: "Công cụ DCA & ROI", category: "Công cụ", to: "/cong-cu/dca-roi", keywords: ["dca", "roi", "đầu tư"] },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { list, remove, synced } = useWatchlist();

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term
      ? SEARCH_SUGGESTIONS.filter(
          (s) =>
            s.symbol.toLowerCase().includes(term) ||
            s.label.toLowerCase().includes(term) ||
            s.keywords.some((k) => k.includes(term)),
        )
      : SEARCH_SUGGESTIONS.slice(0, 6);
    return pool.slice(0, 6);
  }, [q]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  const goToSuggestion = (s: SearchSuggestion) => {
    onSearch?.(s.symbol.toLowerCase());
    navigate({ to: s.to as never });
    setSearchOpen(false);
    setSuggestOpen(false);
    setQ("");
  };

  const fallbackRoute = (term: string): string | null => {
    const sym = term.replace(/[^a-z0-9-]/g, "");
    if (/^(btc|eth|sol|bnb|xrp|ada|doge|ton|trx|dot|matic|avax|link|ltc|atom)$/.test(sym)) return `/tai-san/${sym}`;
    if (/^(usd|eur|jpy|gbp|aud|cad|chf|cny|krw|sgd|thb|hkd)$/.test(sym)) return `/tai-san/${sym}`;
    if (/btc|eth|sol|crypto|bitcoin/.test(term)) return "/tien-dien-tu";
    if (/sjc|xau|pnj|vàng|vang|gold/.test(term)) return "/gia-vang";
    if (/usd|eur|jpy|forex|ngoại|ngoai/.test(term)) return "/ty-gia-ngoai-te";
    if (/lãi|lai|ngân hàng|ngan hang|bank|vcb|bidv/.test(term)) return "/ty-gia-ngan-hang";
    if (/đổi|doi|convert/.test(term)) return "/quy-doi-tien-te";
    if (/vn-?index|hose|hnx|chứng|chung|stock/.test(term)) return "/chung-khoan";
    return null;
  };

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
                  if (suggestions[activeIdx]) {
                    goToSuggestion(suggestions[activeIdx]);
                    return;
                  }
                  const term = q.trim().toLowerCase();
                  if (!term) return;
                  onSearch?.(term);
                  const dest = fallbackRoute(term);
                  if (dest) navigate({ to: dest as never });
                  setSearchOpen(false);
                  setSuggestOpen(false);
                }}
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gold)]/80" />
                <Input
                  ref={searchInputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setSuggestOpen(true); onSearch?.(e.target.value); }}
                  onFocus={() => setSuggestOpen(true)}
                  onBlur={() => { setTimeout(() => { setSuggestOpen(false); if (!q) setSearchOpen(false); }, 150); }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
                    else if (e.key === "Escape") { setSuggestOpen(false); setSearchOpen(false); }
                  }}
                  placeholder="BTC, SJC, USD, ETH…"
                  className="pl-9 pr-3 w-64 h-9 rounded-full border border-[var(--gold)]/30 bg-background/90 text-sm shadow-[inset_0_1px_0_color-mix(in_oklab,var(--gold)_10%,transparent),0_4px_14px_-8px_rgba(0,0,0,0.5)] focus-visible:ring-1 focus-visible:ring-[var(--gold)]/60 focus-visible:border-[var(--gold)]/60"
                />
                {suggestOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 border-b border-border/60">
                      Gợi ý
                    </div>
                    <ul className="py-1 max-h-72 overflow-auto">
                      {suggestions.map((s, idx) => (
                        <li key={s.symbol}>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); goToSuggestion(s); }}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${idx === activeIdx ? "bg-accent" : "hover:bg-accent/60"}`}
                          >
                            <span className="inline-flex min-w-[44px] justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--gold)]">
                              {s.symbol}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm text-foreground truncate">{s.label}</span>
                              <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{s.category}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
          {/* Desktop watchlist */}
          <div className="hidden md:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Theo dõi"
                  className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Star className="h-4 w-4" />
                  {list.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--gold)] text-[10px] font-bold text-background flex items-center justify-center">
                      {list.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                  <span>Theo dõi</span>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                      synced
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {synced ? "Đã đồng bộ" : "Cục bộ"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!synced && (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/dang-nhap" as never })}
                    className="block w-full text-left px-3 py-2 text-xs text-[var(--gold)] hover:bg-accent"
                  >
                    Đăng nhập để đồng bộ giữa thiết bị →
                  </button>
                )}
                {list.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">Chưa có tài sản nào</div>
                ) : (
                  list.map((item) => (
                    <DropdownMenuItem key={item.symbol} onClick={() => navigate({ to: item.to as never })} className="flex items-center gap-2 pr-2">
                      <span className="inline-flex min-w-[44px] justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--gold)]">
                        {item.symbol}
                      </span>
                      <span className="flex-1 truncate text-sm">{item.label}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); remove(item.symbol); }}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        aria-label="Xóa"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="hidden xl:inline eyebrow opacity-50">{time}</span>
          <NumberFormatToggle />
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
            {/* Mobile watchlist */}
            {list.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 px-1">
                  Theo dõi
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/40 p-1">
                  {list.map((item) => (
                    <Link
                      key={item.symbol}
                      to={item.to}
                      activeOptions={{ exact: true }}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-foreground/90 hover:bg-accent data-[status=active]:bg-accent/70 data-[status=active]:text-[var(--gold)]"
                    >
                      <Star className="h-3 w-3 text-[var(--gold)] shrink-0" />
                      <span className="truncate">{item.symbol}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
                  <div className="rounded-xl border border-border bg-card/80 p-2.5 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-amber-700 text-background text-xs font-bold uppercase">
                      {(user.email ?? "?").slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Đã đăng nhập</div>
                      <div className="text-xs text-foreground truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={() => { setOpen(false); signOut().then(() => navigate({ to: "/" })); }}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-3 w-3" /> Thoát
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/cai-dat"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                    >
                      <Settings className="h-3 w-3" /> Cài đặt
                    </Link>
                    <Link
                      to="/cai-dat/ban-tin"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-3 w-3" /> Bản tin
                    </Link>
                  </div>
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
