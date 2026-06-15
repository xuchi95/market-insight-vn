import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, LogOut, Mail, Menu, PieChart, Search, Settings, Sparkles, Star, User as UserIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import logoAsset from "@/assets/logo.webp.asset.json";
const logoUrl = logoAsset.url;
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import { NumberFormatToggle } from "@/components/site/NumberFormatToggle";
import { PushNotificationButton } from "@/components/site/PushNotificationButton";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/site/AdSlot";
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
          { label: "Giá xăng/dầu", to: "/gia-xang-dau", hint: "Brent, WTI & Petrolimex" },
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
          { label: "DCA lịch sử (giá thật)", to: "/cong-cu/dca-lich-su", hint: "Mô phỏng với BTC/ETH" },
          { label: "Danh mục", to: "/portfolio", hint: "Theo dõi tài sản" },
          { label: "Tính lãi tiết kiệm", to: "/tinh-lai-suat-tiet-kiem", hint: "Tính lãi gửi ngân hàng" },
          { label: "Lãi suất tiết kiệm", to: "/lai-suat-tiet-kiem", hint: "So sánh ngân hàng" },
          { label: "Quy đổi tiền tệ", to: "/quy-doi-tien-te", hint: "Đổi tiền nhanh" },
        ],
      },
      {
        heading: "Dữ liệu",
        items: [
          { label: "Lịch kinh tế", to: "/lich-kinh-te", hint: "Sự kiện vĩ mô" },
          { label: "Vĩ mô Việt Nam", to: "/vi-mo-viet-nam", hint: "GDP, CPI, lãi suất" },
          { label: "AI dự đoán giá", to: "/du-doan-gia-ai", hint: "Vàng, dầu, BTC, ngoại tệ" },
          { label: "API cho nhà phát triển", to: "/api-cho-nha-phat-trien", hint: "REST · SSE · SDK realtime" },
          { label: "Widget nhúng", to: "/cong-cu/widget-nhung", hint: "Iframe cho blog/web" },
          { label: "Từ điển tài chính", to: "/tu-dien", hint: "Thuật ngữ đầu tư VN" },
          { label: "Nguồn dữ liệu & phương pháp tính", to: "/nguon-du-lieu", hint: "Lấy từ đâu, cập nhật ra sao" },
          { label: "Về MarketWatch Việt Nam", to: "/ve-chung-toi", hint: "Đội ngũ & sứ mệnh" },
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
  // Tiền điện tử (top theo vốn hoá — khớp với danh sách /api/public/crypto)
  { symbol: "BTC", label: "Bitcoin", category: "Tiền điện tử", to: "/tai-san/btc", keywords: ["btc", "bitcoin", "crypto"] },
  { symbol: "ETH", label: "Ethereum", category: "Tiền điện tử", to: "/tai-san/eth", keywords: ["eth", "ethereum"] },
  { symbol: "USDT", label: "Tether", category: "Tiền điện tử", to: "/tai-san/usdt", keywords: ["usdt", "tether", "stablecoin"] },
  { symbol: "BNB", label: "BNB", category: "Tiền điện tử", to: "/tai-san/bnb", keywords: ["bnb", "binance"] },
  { symbol: "SOL", label: "Solana", category: "Tiền điện tử", to: "/tai-san/sol", keywords: ["sol", "solana"] },
  { symbol: "XRP", label: "XRP (Ripple)", category: "Tiền điện tử", to: "/tai-san/xrp", keywords: ["xrp", "ripple"] },
  { symbol: "DOGE", label: "Dogecoin", category: "Tiền điện tử", to: "/tai-san/doge", keywords: ["doge", "dogecoin"] },
  { symbol: "TON", label: "Toncoin", category: "Tiền điện tử", to: "/tai-san/ton", keywords: ["ton", "toncoin"] },
  { symbol: "ADA", label: "Cardano", category: "Tiền điện tử", to: "/tai-san/ada", keywords: ["ada", "cardano"] },
  { symbol: "AVAX", label: "Avalanche", category: "Tiền điện tử", to: "/tai-san/avax", keywords: ["avax", "avalanche"] },
  { symbol: "TRX", label: "Tron", category: "Tiền điện tử", to: "/tai-san/trx", keywords: ["trx", "tron"] },
  { symbol: "LINK", label: "Chainlink", category: "Tiền điện tử", to: "/tai-san/link", keywords: ["link", "chainlink"] },
  { symbol: "DOT", label: "Polkadot", category: "Tiền điện tử", to: "/tai-san/dot", keywords: ["dot", "polkadot"] },
  { symbol: "POL", label: "Polygon (POL)", category: "Tiền điện tử", to: "/tai-san/pol", keywords: ["pol", "matic", "polygon"] },
  { symbol: "SHIB", label: "Shiba Inu", category: "Tiền điện tử", to: "/tai-san/shib", keywords: ["shib", "shiba", "shiba inu"] },
  { symbol: "LTC", label: "Litecoin", category: "Tiền điện tử", to: "/tai-san/ltc", keywords: ["ltc", "litecoin"] },
  { symbol: "BCH", label: "Bitcoin Cash", category: "Tiền điện tử", to: "/tai-san/bch", keywords: ["bch", "bitcoin cash"] },
  { symbol: "UNI", label: "Uniswap", category: "Tiền điện tử", to: "/tai-san/uni", keywords: ["uni", "uniswap"] },
  { symbol: "XLM", label: "Stellar", category: "Tiền điện tử", to: "/tai-san/xlm", keywords: ["xlm", "stellar"] },
  { symbol: "NEAR", label: "NEAR Protocol", category: "Tiền điện tử", to: "/tai-san/near", keywords: ["near"] },
  { symbol: "ICP", label: "Internet Computer", category: "Tiền điện tử", to: "/tai-san/icp", keywords: ["icp", "internet computer"] },
  { symbol: "APT", label: "Aptos", category: "Tiền điện tử", to: "/tai-san/apt", keywords: ["apt", "aptos"] },
  { symbol: "ATOM", label: "Cosmos", category: "Tiền điện tử", to: "/tai-san/atom", keywords: ["atom", "cosmos"] },
  { symbol: "XMR", label: "Monero", category: "Tiền điện tử", to: "/tai-san/xmr", keywords: ["xmr", "monero"] },
  { symbol: "ETC", label: "Ethereum Classic", category: "Tiền điện tử", to: "/tai-san/etc", keywords: ["etc", "ethereum classic"] },
  { symbol: "FIL", label: "Filecoin", category: "Tiền điện tử", to: "/tai-san/fil", keywords: ["fil", "filecoin"] },
  { symbol: "HBAR", label: "Hedera", category: "Tiền điện tử", to: "/tai-san/hbar", keywords: ["hbar", "hedera"] },
  { symbol: "ARB", label: "Arbitrum", category: "Tiền điện tử", to: "/tai-san/arb", keywords: ["arb", "arbitrum"] },
  { symbol: "VET", label: "VeChain", category: "Tiền điện tử", to: "/tai-san/vet", keywords: ["vet", "vechain"] },
  { symbol: "MKR", label: "Maker", category: "Tiền điện tử", to: "/tai-san/mkr", keywords: ["mkr", "maker"] },
  { symbol: "RENDER", label: "Render", category: "Tiền điện tử", to: "/tai-san/render", keywords: ["render", "rndr"] },
  { symbol: "INJ", label: "Injective", category: "Tiền điện tử", to: "/tai-san/inj", keywords: ["inj", "injective"] },
  { symbol: "OP", label: "Optimism", category: "Tiền điện tử", to: "/tai-san/op", keywords: ["op", "optimism"] },
  { symbol: "SUI", label: "Sui", category: "Tiền điện tử", to: "/tai-san/sui", keywords: ["sui"] },
  { symbol: "PEPE", label: "Pepe", category: "Tiền điện tử", to: "/tai-san/pepe", keywords: ["pepe", "meme"] },
  { symbol: "USDC", label: "USD Coin", category: "Tiền điện tử", to: "/tai-san/usdc", keywords: ["usdc", "usd coin", "stablecoin"] },
  { symbol: "DAI", label: "Dai", category: "Tiền điện tử", to: "/tai-san/dai", keywords: ["dai", "stablecoin"] },
  { symbol: "WBTC", label: "Wrapped Bitcoin", category: "Tiền điện tử", to: "/tai-san/wbtc", keywords: ["wbtc", "wrapped bitcoin"] },
  { symbol: "LEO", label: "LEO Token", category: "Tiền điện tử", to: "/tai-san/leo", keywords: ["leo"] },
  { symbol: "KAS", label: "Kaspa", category: "Tiền điện tử", to: "/tai-san/kas", keywords: ["kas", "kaspa"] },
  { symbol: "ENA", label: "Ethena", category: "Tiền điện tử", to: "/tai-san/ena", keywords: ["ena", "ethena"] },
  { symbol: "WLD", label: "Worldcoin", category: "Tiền điện tử", to: "/tai-san/wld", keywords: ["wld", "worldcoin", "world"] },
  { symbol: "SEI", label: "Sei", category: "Tiền điện tử", to: "/tai-san/sei", keywords: ["sei"] },
  { symbol: "FET", label: "Fetch.ai", category: "Tiền điện tử", to: "/tai-san/fet", keywords: ["fet", "fetch", "fetch.ai", "ai"] },
  { symbol: "JUP", label: "Jupiter", category: "Tiền điện tử", to: "/tai-san/jup", keywords: ["jup", "jupiter"] },
  { symbol: "PYTH", label: "Pyth Network", category: "Tiền điện tử", to: "/tai-san/pyth", keywords: ["pyth"] },
  { symbol: "AAVE", label: "Aave", category: "Tiền điện tử", to: "/tai-san/aave", keywords: ["aave"] },
  { symbol: "ONDO", label: "Ondo Finance", category: "Tiền điện tử", to: "/tai-san/ondo", keywords: ["ondo"] },
  { symbol: "TIA", label: "Celestia", category: "Tiền điện tử", to: "/tai-san/tia", keywords: ["tia", "celestia"] },
  { symbol: "TRUMP", label: "Official Trump", category: "Tiền điện tử", to: "/tai-san/trump", keywords: ["trump", "official trump", "meme"] },
  { symbol: "BONK", label: "Bonk", category: "Tiền điện tử", to: "/tai-san/bonk", keywords: ["bonk", "meme"] },
  { symbol: "FLOKI", label: "Floki", category: "Tiền điện tử", to: "/tai-san/floki", keywords: ["floki", "meme"] },
  { symbol: "WIF", label: "dogwifhat", category: "Tiền điện tử", to: "/tai-san/wif", keywords: ["wif", "dogwifhat", "meme"] },
  { symbol: "BOME", label: "Book of Meme", category: "Tiền điện tử", to: "/tai-san/bome", keywords: ["bome", "book of meme", "meme"] },
  { symbol: "NOT", label: "Notcoin", category: "Tiền điện tử", to: "/tai-san/not", keywords: ["not", "notcoin"] },

  // Vàng
  { symbol: "SJC", label: "Vàng miếng SJC 1L", category: "Vàng", to: "/tai-san/gold-sjc-1l", keywords: ["sjc", "vang", "vàng", "gold"] },
  { symbol: "XAU", label: "Vàng thế giới (XAU/USD)", category: "Vàng", to: "/tai-san/gold-xauusd", keywords: ["xau", "gold", "vàng thế giới"] },
  { symbol: "PNJ", label: "Vàng PNJ", category: "Vàng", to: "/tai-san/gold-pnj", keywords: ["pnj", "vang", "vàng"] },
  { symbol: "DOJI", label: "Vàng DOJI", category: "Vàng", to: "/tai-san/gold-doji", keywords: ["doji", "vang", "vàng"] },

  // Ngoại tệ
  { symbol: "USD", label: "Đô la Mỹ (USD/VND)", category: "Ngoại tệ", to: "/tai-san/usd", keywords: ["usd", "dollar", "đô"] },
  { symbol: "EUR", label: "Euro (EUR/VND)", category: "Ngoại tệ", to: "/tai-san/eur", keywords: ["eur", "euro"] },
  { symbol: "JPY", label: "Yên Nhật (JPY/VND)", category: "Ngoại tệ", to: "/tai-san/jpy", keywords: ["jpy", "yen", "yên"] },
  { symbol: "GBP", label: "Bảng Anh (GBP/VND)", category: "Ngoại tệ", to: "/tai-san/gbp", keywords: ["gbp", "bảng", "bang"] },
  { symbol: "AUD", label: "Đô la Úc (AUD/VND)", category: "Ngoại tệ", to: "/tai-san/aud", keywords: ["aud", "úc"] },
  { symbol: "CAD", label: "Đô la Canada (CAD/VND)", category: "Ngoại tệ", to: "/tai-san/cad", keywords: ["cad", "canada"] },
  { symbol: "CHF", label: "Franc Thuỵ Sĩ (CHF/VND)", category: "Ngoại tệ", to: "/tai-san/chf", keywords: ["chf", "thuỵ sĩ", "swiss"] },
  { symbol: "CNY", label: "Nhân dân tệ (CNY/VND)", category: "Ngoại tệ", to: "/tai-san/cny", keywords: ["cny", "yuan", "nhân dân tệ"] },
  { symbol: "KRW", label: "Won Hàn Quốc (KRW/VND)", category: "Ngoại tệ", to: "/tai-san/krw", keywords: ["krw", "won", "hàn quốc"] },
  { symbol: "SGD", label: "Đô la Singapore (SGD/VND)", category: "Ngoại tệ", to: "/tai-san/sgd", keywords: ["sgd", "singapore"] },
  { symbol: "THB", label: "Baht Thái (THB/VND)", category: "Ngoại tệ", to: "/tai-san/thb", keywords: ["thb", "baht", "thái"] },
  { symbol: "HKD", label: "Đô la Hồng Kông (HKD/VND)", category: "Ngoại tệ", to: "/tai-san/hkd", keywords: ["hkd", "hồng kông"] },

  // Chứng khoán & hàng hoá
  { symbol: "VN-Index", label: "Chỉ số VN-Index", category: "Chứng khoán", to: "/tai-san/vnindex", keywords: ["vnindex", "vn-index", "hose", "chứng khoán"] },
  { symbol: "Brent", label: "Dầu Brent (BZ=F)", category: "Hàng hoá", to: "/tai-san/oil-brent", keywords: ["brent", "dau", "dầu", "oil", "bz=f", "bzf"] },
  { symbol: "WTI", label: "Dầu WTI (CL=F)", category: "Hàng hoá", to: "/tai-san/oil-wti", keywords: ["wti", "dau", "dầu", "oil", "cl=f", "clf", "crude"] },

  // Ngân hàng & công cụ
  { symbol: "VCB·USD", label: "Vietcombank · USD/VND", category: "Ngân hàng", to: "/tai-san/bank-usd", keywords: ["vcb", "vietcombank", "ngân hàng", "usd"] },
  { symbol: "DCA", label: "Công cụ DCA & ROI", category: "Công cụ", to: "/cong-cu/dca-roi", keywords: ["dca", "roi", "đầu tư"] },
];

function useClock() {
  // Start as null so SSR and first client render match; populate after mount.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now ? now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
}

export function Header({ onSearch }: { onSearch?: (q: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Keep the mobile search panel mounted briefly while playing the exit
  // animation, then unmount once the transition completes.
  const [searchVisible, setSearchVisible] = useState(false);
  useEffect(() => {
    if (searchOpen) {
      setSearchVisible(true);
      return;
    }
    if (!searchVisible) return;
    const t = window.setTimeout(() => setSearchVisible(false), 220);
    return () => window.clearTimeout(t);
  }, [searchOpen, searchVisible]);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { list, remove, synced } = useWatchlist();

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SEARCH_SUGGESTIONS.slice(0, 8);
    const norm = (v: string) =>
      v
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
    const n = norm(term);
    type Scored = { s: SearchSuggestion; score: number };
    const scored: Scored[] = [];
    for (const s of SEARCH_SUGGESTIONS) {
      const sym = norm(s.symbol);
      const lab = norm(s.label);
      const kws = s.keywords.map(norm);
      let score = 0;
      if (sym === n) score = 100;
      else if (sym.startsWith(n)) score = 80;
      else if (kws.some((k) => k === n)) score = 70;
      else if (kws.some((k) => k.startsWith(n))) score = 60;
      else if (lab.startsWith(n)) score = 50;
      else if (sym.includes(n) || lab.includes(n) || kws.some((k) => k.includes(n))) score = 30;
      if (score > 0) scored.push({ s, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((x) => x.s);
  }, [q]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  const goToSuggestion = (s: SearchSuggestion) => {
    onSearch?.(s.symbol.toLowerCase());
    if (s.to.startsWith("/tai-san/")) {
      const symbol = s.to.slice("/tai-san/".length);
      navigate({ to: "/tai-san/$symbol", params: { symbol } });
    } else {
      navigate({ to: s.to as never });
    }
    setSearchOpen(false);
    setSuggestOpen(false);
    setQ("");
  };

  const highlightMatch = (text: string, term: string): ReactNode => {
    const t = term.trim();
    if (!t) return text;
    const normChar = (c: string) =>
      c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const n = normChar(t);
    const map: number[] = [];
    let normStr = "";
    for (let i = 0; i < text.length; i++) {
      const dec = normChar(text[i]);
      for (let j = 0; j < dec.length; j++) {
        map.push(i);
        normStr += dec[j];
      }
    }
    const idx = normStr.indexOf(n);
    if (idx < 0 || n.length === 0) return text;
    const startOrig = map[idx];
    const endOrig = (map[idx + n.length - 1] ?? startOrig) + 1;
    return (
      <>
        {text.slice(0, startOrig)}
        <mark className="bg-[var(--gold)]/25 text-[var(--gold)] rounded-sm px-0.5 py-0">
          {text.slice(startOrig, endOrig)}
        </mark>
        {text.slice(endOrig)}
      </>
    );
  };

  const fallbackRoute = (term: string): string | null => {
    const sym = term.replace(/[^a-z0-9-]/g, "");
    if (/^(brent|wti)$/.test(sym)) return `/tai-san/oil-${sym}`;
    if (/^(btc|eth|sol|bnb|xrp|ada|doge|ton|trx|dot|matic|avax|link|ltc|atom)$/.test(sym)) return `/tai-san/${sym}`;
    if (/^(usd|eur|jpy|gbp|aud|cad|chf|cny|krw|sgd|thb|hkd)$/.test(sym)) return `/tai-san/${sym}`;
    if (/brent|dầu brent|dau brent/.test(term)) return "/tai-san/oil-brent";
    if (/\bwti\b|dầu wti|dau wti|crude/.test(term)) return "/tai-san/oil-wti";
    if (/btc|eth|sol|crypto|bitcoin/.test(term)) return "/tien-dien-tu";
    if (/sjc|xau|pnj|vàng|vang|gold/.test(term)) return "/gia-vang";
    if (/usd|eur|jpy|forex|ngoại|ngoai/.test(term)) return "/ty-gia-ngoai-te";
    if (/lãi|lai|ngân hàng|ngan hang|bank|vcb|bidv/.test(term)) return "/ty-gia-ngan-hang";
    if (/đổi|doi|convert/.test(term)) return "/quy-doi-tien-te";
    if (/vn-?index|hose|hnx|chứng|chung|stock/.test(term)) return "/chung-khoan";
    return null;
  };

  return (
    <>
    <header data-testid="site-header" className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 md:py-3 xl:max-w-[60rem] 2xl:max-w-[64rem]">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoUrl} alt="MarketWatch logo" className="h-7 w-7 md:h-8 md:w-8 object-contain" />
          <span className="font-display text-lg md:text-xl leading-none">
            <span className="text-[var(--gold)]">Market</span><span className="text-foreground">Watch</span>
          </span>
        </Link>

        {/* Desktop NavigationMenu */}
        <div data-testid="header-nav" className="hidden min-w-0 items-center justify-center xl:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-0 lg:gap-0.5">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to={HOME.to}
                    activeOptions={{ exact: true }}
                    className="inline-flex items-center whitespace-nowrap rounded-md px-2 xl:px-3 py-1.5 text-[12px] xl:text-[13px] font-semibold uppercase tracking-[0.1em] xl:tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-[var(--gold)]"
                  >
                    {HOME.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {NAV_GROUPS.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 xl:px-3 py-1.5 text-[12px] xl:text-[13px] font-semibold uppercase tracking-[0.1em] xl:tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors bg-transparent hover:bg-accent focus:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-5 w-[600px] bg-popover">
                      {group.columns.map((col) => (
                        <div key={col.heading} className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 px-3 pb-1 border-b border-border/40">
                            {col.heading}
                          </div>
                          <ul className="space-y-0.5">
                            {col.items.map((item) => (
                              <li key={item.to}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    to={item.to}
                                    activeOptions={{ exact: true }}
                                    className="group block rounded-lg px-3 py-2.5 hover:bg-accent transition-colors data-[status=active]:bg-accent/60"
                                  >
                                    <div className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-[var(--gold)] data-[status=active]:text-[var(--gold)] transition-colors">
                                      {item.label}
                                    </div>
                                    {item.hint && (
                                      <div className="text-[12.5px] leading-snug text-muted-foreground/80 mt-1">
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

        <div data-testid="header-actions" className="flex min-w-0 shrink-0 items-center justify-self-end gap-1 xl:gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="group hidden xl:inline-flex items-center gap-3 pl-1 pr-3 py-1 rounded-full bg-card border border-[var(--gold)]/20 shadow-[0_2px_8px_-2px_rgba(26,22,18,0.06)] hover:border-[var(--gold)]/60 hover:shadow-[0_8px_16px_-4px_color-mix(in_oklab,var(--gold)_18%,transparent)] hover:-translate-y-0.5 transition-all duration-300"
                  aria-label={user.email ?? "Tài khoản"}
                >
                  <span className="relative flex-shrink-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1612] ring-2 ring-[var(--gold)]/10 ring-offset-1 ring-offset-card overflow-hidden group-hover:ring-[var(--gold)]/35 transition-all">
                      <span className="text-[var(--gold)] text-[13px] font-bold tracking-tight uppercase">
                        {(user.email ?? "?").slice(0, 1)}
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                    </span>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[var(--gold)] border-2 border-card shadow-sm" />
                  </span>
                  <span className="text-[13px] font-semibold leading-tight text-foreground max-w-[140px] truncate group-hover:text-[var(--gold)] transition-colors">
                    {user.email}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 text-[var(--gold)]/40 group-hover:text-[var(--gold)] group-hover:translate-y-0.5 transition-all"
                    strokeWidth={3}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-72 p-0 overflow-hidden rounded-2xl border-[var(--gold)]/15 bg-popover text-popover-foreground shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35),0_8px_16px_-8px_rgba(0,0,0,0.2)] ring-1 ring-black/5"
              >
                {/* Header: avatar + email + status */}
                <div className="relative px-4 pt-4 pb-3 bg-gradient-to-br from-[color-mix(in_oklab,var(--gold)_8%,transparent)] via-transparent to-transparent border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <span className="relative flex-shrink-0">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1612] ring-2 ring-[var(--gold)]/30 ring-offset-2 ring-offset-popover overflow-hidden">
                        <span className="text-[var(--gold)] text-sm font-bold uppercase tracking-tight">
                          {(user.email ?? "?").slice(0, 1)}
                        </span>
                        <span className="absolute inset-0 bg-gradient-to-tr from-white/8 to-transparent pointer-events-none" />
                      </span>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-popover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">Đã đăng nhập</div>
                      <div className="text-[13px] font-semibold text-foreground truncate" title={user.email ?? ""}>{user.email}</div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="p-1.5">
                  {[
                    { to: "/portfolio", icon: PieChart, label: "Danh mục của tôi", desc: "Theo dõi & phân bổ tài sản" },
                    { to: "/cai-dat", icon: Settings, label: "Cài đặt tài khoản", desc: "Bảo mật, mật khẩu, email" },
                    { to: "/cai-dat/ban-tin", icon: Mail, label: "Quản lý bản tin", desc: "Chủ đề & tần suất nhận tin" },
                  ].map((it) => (
                    <DropdownMenuItem
                      key={it.to}
                      onClick={() => navigate({ to: it.to as never })}
                      className="group/item gap-3 rounded-xl px-2.5 py-2 cursor-pointer focus:bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] focus:text-foreground transition-colors"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-[var(--gold)] group-hover/item:border-[var(--gold)]/45 group-hover/item:bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] transition-colors">
                        <it.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium leading-tight text-foreground">{it.label}</span>
                        <span className="block text-[11px] leading-tight text-muted-foreground mt-0.5">{it.desc}</span>
                      </span>
                      <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground/50 group-hover/item:text-[var(--gold)] group-hover/item:translate-x-0.5 transition-all" strokeWidth={3} />
                    </DropdownMenuItem>
                  ))}
                </div>

                <DropdownMenuSeparator className="my-0 bg-border/60" />

                {/* Sign out */}
                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={() => signOut().then(() => navigate({ to: "/" }))}
                    className="group/out gap-3 rounded-xl px-2.5 py-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/5 text-destructive group-hover/out:border-destructive/50 group-hover/out:bg-destructive/10 transition-colors">
                      <LogOut className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-medium">Đăng xuất</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden xl:flex items-center gap-1">
              <Link
                to="/dang-nhap"
                className="inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/dang-ky"
                className="inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-background bg-gradient-to-r from-[var(--gold)] to-amber-600 shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_40%,transparent),0_6px_18px_-6px_color-mix(in_oklab,var(--gold)_50%,transparent)] hover:shadow-[0_0_0_1px_var(--gold),0_8px_24px_-6px_color-mix(in_oklab,var(--gold)_70%,transparent)] transition-shadow"
              >
                Đăng ký
              </Link>
            </div>
          )}
          {/* Mobile search trigger */}
          <button
            type="button"
            data-testid="header-mobile-search-trigger"
            onClick={() => setSearchOpen(true)}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="lg:hidden inline-flex">
            <PushNotificationButton />
          </div>
          <button
            data-testid="header-mobile-menu-trigger"
            className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search sheet */}
      {searchVisible && typeof document !== "undefined" && createPortal(
        <div
          data-testid="header-mobile-search-panel"
          data-state={searchOpen ? "open" : "closed"}
          className="lg:hidden fixed inset-0 z-[100] flex flex-col bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out duration-200"
        >
          <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-top-4 data-[state=closed]:slide-out-to-top-4 duration-200" data-state={searchOpen ? "open" : "closed"}>
            <form
              data-testid="header-mobile-search-form"
              className="relative flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (suggestions[activeIdx]) { goToSuggestion(suggestions[activeIdx]); return; }
                const term = q.trim().toLowerCase();
                if (!term) return;
                onSearch?.(term);
                const dest = fallbackRoute(term);
                if (dest) navigate({ to: dest as never });
                setSearchOpen(false);
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gold)]/80" />
                <Input
                  ref={searchInputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setSuggestOpen(true); }}
                  onFocus={() => setSuggestOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
                    else if (e.key === "Escape") { setSearchOpen(false); }
                  }}
                  placeholder="SUI, XRP, Ethereum, SJC, USD…"
                  className="pl-9 pr-3 h-11 w-full rounded-full border border-[var(--gold)]/30 bg-card text-base"
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setQ(""); }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-background px-2 py-2 [scrollbar-gutter:stable]">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 transition-opacity duration-150">
              {q.trim() ? `Kết quả (${suggestions.length})` : "Gợi ý phổ biến"}
            </div>
            <div className="relative min-h-[60vh]">
              {suggestions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground animate-in fade-in duration-150">
                  Không tìm thấy "{q}"
                </div>
              ) : (
                <ul data-testid="header-mobile-search-results" className="space-y-0.5">
                {suggestions.map((s, idx) => (
                  <li key={s.symbol} data-testid={idx === 0 ? "header-mobile-search-result-first" : undefined}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); goToSuggestion(s); }}
                      onClick={() => goToSuggestion(s)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors duration-150 ${idx === activeIdx ? "bg-accent" : "hover:bg-accent/60"}`}
                    >
                      <span className="inline-flex min-w-[52px] justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-2 py-1 text-[11px] font-bold tracking-wider text-[var(--gold)]">
                        {highlightMatch(s.symbol, q)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] text-foreground truncate">{highlightMatch(s.label, q)}</span>
                        <span className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">{s.category}</span>
                      </span>
                    </button>
                  </li>
                ))}
                </ul>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Mobile nav */}
      {open && (
        <nav className="xl:hidden border-t border-[var(--gold)]/20 bg-gradient-to-b from-card via-card to-background/95 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--gold)_15%,transparent),0_12px_30px_-12px_rgba(0,0,0,0.6)]">
          <div className="mx-auto max-w-6xl px-4 py-3 space-y-3">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground bg-accent/40 border border-border data-[status=active]:text-[var(--gold)] data-[status=active]:border-[var(--gold)]/40"
            >
              Tổng quan
            </Link>
            {/* Mobile watchlist removed to keep menu compact — full watchlist available on home page */}
            {NAV_GROUPS.map((group) => (
              <details
                key={group.label}
                className="group rounded-xl border border-border bg-background/40 overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-semibold text-foreground marker:hidden list-none [&::-webkit-details-marker]:hidden">
                  <span>{group.label}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div className="grid grid-cols-2 gap-1 border-t border-border/60 p-1">
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
              </details>
            ))}
            <div className="pt-3 mt-1 border-t border-border">
              {/* Giao diện sáng/tối — đặt trong menu để không chiếm chỗ header */}
              <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                    Giao diện
                  </div>
                  <div className="text-sm text-foreground">Sáng / Tối</div>
                </div>
                <ThemeToggle />
              </div>
              <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                    Thông báo giá
                  </div>
                  <div className="text-sm text-foreground">9h sáng &amp; 18h chiều</div>
                </div>
                <PushNotificationButton />
              </div>
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
    {typeof document !== "undefined" && createPortal(
    <div className="pointer-events-none fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 lg:block">
      <div
        data-testid="header-toolbar"
        className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-full border border-border/70 bg-card/85 px-1.5 py-1.5 shadow-[0_14px_38px_-18px_rgba(0,0,0,0.75),inset_0_1px_0_color-mix(in_oklab,white_5%,transparent)] backdrop-blur-xl"
      >
        <div className="flex items-center">
          {searchOpen ? (
            <form
              data-testid="header-search-form"
              className="relative animate-in fade-in slide-in-from-left-2 duration-200"
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
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gold)]/80" />
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
                className="h-9 w-56 rounded-full border border-[var(--gold)]/30 bg-background/90 pl-9 pr-3 text-sm shadow-[inset_0_1px_0_color-mix(in_oklab,var(--gold)_10%,transparent),0_4px_14px_-8px_rgba(0,0,0,0.5)] focus-visible:border-[var(--gold)]/60 focus-visible:ring-1 focus-visible:ring-[var(--gold)]/60 lg:w-64"
              />
              {suggestOpen && suggestions.length > 0 && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[60] w-72 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35),0_8px_16px_-8px_rgba(0,0,0,0.2)] ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="border-b border-border/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                    Gợi ý
                  </div>
                  <ul className="max-h-72 overflow-auto py-1">
                    {suggestions.map((s, idx) => (
                      <li key={s.symbol}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); goToSuggestion(s); }}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${idx === activeIdx ? "bg-accent" : "hover:bg-accent/60"}`}
                        >
                          <span className="inline-flex min-w-[44px] justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--gold)]">
                            {highlightMatch(s.symbol, q)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-foreground">{highlightMatch(s.label, q)}</span>
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
              data-testid="header-search-trigger"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Star className="h-4 w-4" />
                {list.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] font-bold text-background">
                    {list.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="left" className="w-64">
              <DropdownMenuLabel className="flex items-center justify-between gap-2">
                <span>Theo dõi</span>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
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
                  className="block w-full px-3 py-2 text-left text-xs text-[var(--gold)] hover:bg-accent"
                >
                  Đăng nhập để đồng bộ giữa thiết bị →
                </button>
              )}
              {list.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">Chưa có tài sản nào</div>
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
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <span className="my-1 h-px w-5 bg-border/60" aria-hidden />
        <NumberFormatToggle />
        <ThemeToggle />
        <PushNotificationButton />
      </div>
    </div>,
    document.body,
    )}
    {/* Khung quảng cáo dưới header (leaderboard). Tự ẩn nếu chưa cấu hình VITE_ADSENSE_CLIENT. */}
    <AdSlot placement="header" slot={import.meta.env.VITE_ADSENSE_SLOT_HEADER as string | undefined} className="my-3 md:my-4" />
    </>
  );
}
