import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { DataDisclaimer } from "@/components/site/DataDisclaimer";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SectionCard, LiveDot } from "@/components/site/SectionCard";
import { ChangeBadge } from "@/components/site/ChangeBadge";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchStockIndices } from "@/lib/services/stockIndexService";
import { fetchForexRates } from "@/lib/services/forexRateService";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchBankRates } from "@/lib/services/bankRateService";
import { PriceHistory } from "@/components/site/PriceHistory";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCompactUSD, fmtUSD, fmtVND, fmtTime, fmtNum, fmtTrieu } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useWatchlist, type WatchItem } from "@/hooks/useWatchlist";
import { Star, BellRing, BellOff, Loader2, Mail, AlertTriangle, RefreshCw, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Link as RouterLink } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { updateWatchAlertPrefs, getMyWatchAlertPrefs } from "@/lib/watchlist/alerts.functions";
import { toast } from "sonner";
import { TradingViewChart, toTradingViewCryptoSymbol } from "@/components/site/TradingViewChart";
import { useTheme } from "@/hooks/useTheme";
import { useBinanceTicker } from "@/hooks/useBinanceTicker";
import { keepPreviousData } from "@tanstack/react-query";
import { CryptoCommunityFeed } from "@/components/site/CryptoCommunityFeed";
import { AdSlot } from "@/components/site/AdSlot";
import {
  Panel,
  SectionLabel,
  LivePing,
  KpiStrip,
  StatRow,
  ChartError,
  ChartEmpty,
  AssetHero,
  type KpiCell,
  type HeroProps,
} from "@/components/site/AssetShell";

// Map các CoinGecko-id phổ biến → ticker để 301 redirect về URL canonical.
// Sitemap chỉ chứa dạng ticker, nên đây là form duy nhất Google nên index.
const SLUG_TO_SYMBOL: Record<string, string> = {
  bitcoin: "btc",
  ethereum: "eth",
  tether: "usdt",
  binancecoin: "bnb",
  solana: "sol",
  ripple: "xrp",
  "usd-coin": "usdc",
  dogecoin: "doge",
  cardano: "ada",
  "tron-network": "trx",
  tron: "trx",
  toncoin: "ton",
  "the-open-network": "ton",
  avalanche: "avax",
  "avalanche-2": "avax",
  chainlink: "link",
  polkadot: "dot",
  "matic-network": "matic",
  polygon: "matic",
  "polygon-pos": "pol",
  "shiba-inu": "shib",
  litecoin: "ltc",
  "bitcoin-cash": "bch",
  uniswap: "uni",
  stellar: "xlm",
  "near-protocol": "near",
  "internet-computer": "icp",
  aptos: "apt",
  cosmos: "atom",
  monero: "xmr",
  "ethereum-classic": "etc",
  filecoin: "fil",
  "hedera-hashgraph": "hbar",
  arbitrum: "arb",
  vechain: "vet",
  maker: "mkr",
  "render-token": "render",
  injective: "inj",
  optimism: "op",
  sui: "sui",
  "pepe-coin": "pepe",
  pepe: "pepe",
  dai: "dai",
  "wrapped-bitcoin": "wbtc",
  "leo-token": "leo",
  kaspa: "kas",
};

// Các mã ngoại tệ hợp lệ cho trang `bank-{code}` (tỷ giá Vietcombank).
const BANK_CURRENCIES = new Set([
  "usd","eur","gbp","jpy","cny","krw","sgd","thb","aud","cad","chf","hkd",
  "nzd","myr","dkk","nok","sek","rub","kwd","sar","inr","lak",
]);

// Sitemap cũ từng quảng bá nhầm `/tai-san/bank-{mã ngân hàng}` (acb, mbb...).
// 301 các URL đó về trang cổ phiếu tương ứng để Google hợp nhất index.
const BANK_SLUG_TO_STOCK: Record<string, string> = {
  vcb: "vcb",
  bidv: "bid",
  bid: "bid",
  ctg: "ctg",
  mbb: "mbb",
  tcb: "tcb",
  vpb: "vpb",
  acb: "acb",
  hdb: "hdb",
  stb: "stb",
  shb: "shb",
  vietcombank: "vcb",
  techcombank: "tcb",
  sacombank: "stb",
};

export const Route = createFileRoute("/tai-san/$symbol")({
  // SEO canonical: `/tai-san/{coingecko-id}` (vd: /tai-san/bitcoin) phải 301
  // sang dạng ticker (`/tai-san/btc`) để Google không thấy 2 URL có cùng nội
  // dung. Đây cũng là cách `/asset/bitcoin` (đã 301 sang /tai-san/bitcoin)
  // cuối cùng tới đúng URL ticker trong sitemap.
  beforeLoad: ({ params }) => {
    const lower = params.symbol.toLowerCase();
    // `bank-{x}`: chỉ hợp lệ khi x là mã ngoại tệ. Nếu x là mã ngân hàng
    // (URL sai do sitemap cũ) → 301 về trang cổ phiếu; còn lại → 301 về
    // bảng tỷ giá ngân hàng thay vì trả trang "không tìm thấy" (soft-404).
    if (lower.startsWith("bank-")) {
      const code = lower.slice("bank-".length);
      if (!BANK_CURRENCIES.has(code)) {
        const stock = BANK_SLUG_TO_STOCK[code];
        if (stock) {
          throw redirect({ to: "/co-phieu/$symbol", params: { symbol: stock }, statusCode: 301 });
        }
        throw redirect({ to: "/ty-gia-ngan-hang", statusCode: 301 });
      }
    }
    const ticker = SLUG_TO_SYMBOL[lower];
    if (ticker && ticker !== lower) {
      throw redirect({
        to: "/tai-san/$symbol",
        params: { symbol: ticker },
        statusCode: 301,
      });
    }
  },
  loader: async ({ context, params }) => {
    // Pre-fetch the relevant dataset on the server so the SSR HTML renders
    // real content (price, name, KPIs) instead of the "Không tìm thấy mã"
    // fallback. Without this, Googlebot indexes the empty state and uses
    // "Không tìm thấy..." as the SERP title.
    const slug = params.symbol.toLowerCase();
    const qc = context.queryClient;
    try {
      if (slug.startsWith("bank-")) {
        await qc.ensureQueryData({ queryKey: ["bank-rates"], queryFn: fetchBankRates });
      } else if (slug.startsWith("gold-")) {
        await qc.ensureQueryData({ queryKey: ["gold"], queryFn: fetchGoldPrices });
      } else if (slug === "oil-brent" || slug === "oil-wti") {
        await qc.ensureQueryData({
          queryKey: ["oil"],
          queryFn: async () => {
            const r = await fetch("/api/public/oil");
            if (!r.ok) throw new Error("oil " + r.status);
            return r.json();
          },
        });
      } else {
        await qc.ensureQueryData({ queryKey: ["crypto"], queryFn: () => fetchCryptoPrices() });
      }
    } catch {
      // Loader errors should not block render — client will retry the query.
    }
  },
  head: ({ params }) => {
    const SYM = params.symbol.toUpperCase();
    const SITE = "https://marketwatch.vn";
    const slug = params.symbol.toLowerCase();
    const URL = `${SITE}/tai-san/${slug}`;

    // Oil (Brent/WTI) — SEO chuyên biệt
    const isOilBrent = slug === "oil-brent";
    const isOilWti = slug === "oil-wti";
    const isOil = isOilBrent || isOilWti;
    const isGold = slug.startsWith("gold-");
    const isBank = slug.startsWith("bank-");
    const isCrypto = !isOil && !isGold && !isBank;
    const OG_IMAGE = `${SITE}/og-image.png`;

    let TITLE: string;
    let DESC: string;
    let KEYWORDS: string;
    let BREADCRUMB_PARENT = { name: "Crypto", item: `${SITE}/tien-dien-tu` };
    let BREADCRUMB_LEAF = SYM;
    let OG_TYPE = "website";

    if (isOilBrent) {
      TITLE = "Giá dầu Brent hôm nay — Biểu đồ Brent (BZ=F) USD/thùng realtime | MarketWatch";
      DESC =
        "Giá dầu Brent hôm nay cập nhật realtime từ sàn ICE (BZ=F): biến động phiên, % thay đổi 24h/7 ngày/30 ngày/90 ngày, đỉnh đáy và biểu đồ giá dầu Brent USD/thùng chi tiết.";
      KEYWORDS =
        "giá dầu brent, giá dầu brent hôm nay, dầu brent, brent oil, BZ=F, biểu đồ dầu brent, giá dầu thế giới, USD/thùng";
      BREADCRUMB_PARENT = { name: "Giá dầu thế giới", item: `${SITE}/#oil` };
      BREADCRUMB_LEAF = "Dầu Brent";
      OG_TYPE = "article";
    } else if (isOilWti) {
      TITLE = "Giá dầu WTI hôm nay — Biểu đồ WTI (CL=F) USD/thùng realtime | MarketWatch";
      DESC =
        "Giá dầu WTI hôm nay cập nhật realtime từ sàn NYMEX (CL=F): biến động phiên, % thay đổi 24h/7 ngày/30 ngày/90 ngày, đỉnh đáy và biểu đồ giá dầu thô WTI USD/thùng chi tiết.";
      KEYWORDS =
        "giá dầu wti, giá dầu wti hôm nay, dầu wti, wti crude, CL=F, biểu đồ dầu wti, giá dầu thô mỹ, USD/thùng";
      BREADCRUMB_PARENT = { name: "Giá dầu thế giới", item: `${SITE}/#oil` };
      BREADCRUMB_LEAF = "Dầu WTI";
      OG_TYPE = "article";
    } else if (isGold) {
      const id = slug.slice("gold-".length).toUpperCase();
      TITLE = `Giá vàng ${id} hôm nay — Biểu đồ giá vàng realtime | MarketWatch`;
      DESC = `Giá vàng ${id} hôm nay cập nhật realtime: giá mua, giá bán, biến động, biểu đồ giá vàng ${id} VND/chỉ chi tiết (1 lượng = 10 chỉ).`;
      KEYWORDS = `giá vàng ${id.toLowerCase()}, giá vàng hôm nay, biểu đồ vàng ${id.toLowerCase()}, vàng ${id.toLowerCase()} mua bán`;
      BREADCRUMB_PARENT = { name: "Giá vàng", item: `${SITE}/gia-vang` };
      BREADCRUMB_LEAF = `Vàng ${id}`;
      OG_TYPE = "article";
    } else if (isBank) {
      const code = slug.slice("bank-".length).toUpperCase();
      TITLE = `Tỷ giá ${code} Vietcombank hôm nay — Mua/Bán realtime | MarketWatch`;
      DESC = `Tỷ giá ${code} Vietcombank hôm nay cập nhật realtime: giá mua tiền mặt, mua chuyển khoản, giá bán và biến động ${code}/VND chi tiết.`;
      KEYWORDS = `tỷ giá ${code.toLowerCase()}, tỷ giá ${code.toLowerCase()} vietcombank, ${code.toLowerCase()}/vnd, tỷ giá ngân hàng ${code.toLowerCase()}`;
      BREADCRUMB_PARENT = { name: "Tỷ giá ngân hàng", item: `${SITE}/ty-gia-ngan-hang` };
      BREADCRUMB_LEAF = `${code} · Vietcombank`;
      OG_TYPE = "article";
    } else {
      TITLE = `Giá ${SYM} hôm nay — Biểu đồ ${SYM}/USD realtime | MarketWatch`;
      DESC = `Giá ${SYM} hôm nay cập nhật realtime: biến động 24h, vốn hoá thị trường, khối lượng giao dịch và biểu đồ giá ${SYM}/USD chi tiết.`;
      KEYWORDS = `giá ${SYM.toLowerCase()}, giá ${SYM.toLowerCase()} hôm nay, ${SYM.toLowerCase()}/usd, biểu đồ ${SYM.toLowerCase()}, vốn hoá ${SYM.toLowerCase()}`;
      OG_TYPE = "article";
    }
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { name: "keywords", content: KEYWORDS },
        { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:url", content: URL },
        { property: "og:type", content: OG_TYPE },
        { property: "og:locale", content: "vi_VN" },
        { property: "og:site_name", content: "MarketWatch" },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:secure_url", content: OG_IMAGE },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: TITLE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@MarketWatchVN" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
        { name: "twitter:image", content: OG_IMAGE },
        { name: "twitter:image:alt", content: TITLE },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: BREADCRUMB_PARENT.name, item: BREADCRUMB_PARENT.item },
              { "@type": "ListItem", position: 3, name: BREADCRUMB_LEAF, item: URL },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            isCrypto
              ? {
                  "@context": "https://schema.org",
                  "@type": "FinancialProduct",
                  name: `${SYM} (${SYM}/USD)`,
                  category: "Cryptocurrency",
                  url: URL,
                  description: DESC,
                  image: OG_IMAGE,
                  provider: { "@type": "Organization", name: "MarketWatch", url: SITE },
                }
              : isGold
                ? {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    name: BREADCRUMB_LEAF,
                    category: "Vàng miếng",
                    url: URL,
                    description: DESC,
                    image: OG_IMAGE,
                    brand: { "@type": "Brand", name: BREADCRUMB_LEAF.replace(/^Vàng\s+/, "") },
                  }
                : isBank
                  ? {
                      "@context": "https://schema.org",
                      "@type": "FinancialProduct",
                      name: BREADCRUMB_LEAF,
                      category: "Tỷ giá ngoại tệ ngân hàng",
                      url: URL,
                      description: DESC,
                      image: OG_IMAGE,
                      provider: { "@type": "Organization", name: "Vietcombank" },
                    }
                  : {
                      "@context": "https://schema.org",
                      "@type": "Product",
                      name: isOilBrent ? "Dầu Brent (BZ=F)" : "Dầu WTI (CL=F)",
                      category: "Hàng hoá · Dầu thô",
                      url: URL,
                      description: DESC,
                      image: OG_IMAGE,
                      brand: { "@type": "Brand", name: isOilBrent ? "ICE" : "NYMEX" },
                    },
          ),
        },
        ...(isOil
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: isOilBrent
                        ? "Giá dầu Brent hôm nay là bao nhiêu?"
                        : "Giá dầu WTI hôm nay là bao nhiêu?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: isOilBrent
                          ? "Giá dầu Brent (BZ=F) được cập nhật realtime từ sàn ICE, hiển thị theo USD/thùng cùng % thay đổi so với phiên trước trên MarketWatch."
                          : "Giá dầu WTI (CL=F) được cập nhật realtime từ sàn NYMEX, hiển thị theo USD/thùng cùng % thay đổi so với phiên trước trên MarketWatch.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Dữ liệu giá dầu được lấy từ đâu?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Dữ liệu giá dầu Brent và WTI được tổng hợp từ Yahoo Finance, cập nhật mỗi 60 giây và có lịch sử 24h, 7 ngày, 30 ngày, 90 ngày.",
                      },
                    },
                  ],
                }),
              },
            ]
          : []),
      ],
    };
  },
  component: AssetDetail,
});

async function loadChart(id: string, days: string) {
  try {
    const r = await fetch(`/api/public/crypto-chart?id=${encodeURIComponent(id)}&days=${encodeURIComponent(days)}`);
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j?.prices)) return j.prices as { t: number; v: number }[];
    }
  } catch {}
  return [];
}

function AssetDetail() {
  const { symbol } = useParams({ from: "/tai-san/$symbol" });
  const [range, setRange] = useState("7");
  const { theme } = useTheme();
  const { user } = useAuth();

  const lower = symbol.toLowerCase();
  const isGold = lower.startsWith("gold-");
  const isBank = lower.startsWith("bank-");
  const isOil = lower === "oil-brent" || lower === "oil-wti";
  const oilId = isOil ? (lower === "oil-brent" ? "brent" : "wti") : null;
  // Accept both prefixed (`gold-sjc-1l`) and bare (`sjc-1l`) slugs so
  // older watchlist entries stored without the `gold-` prefix still resolve.
  const goldId = isGold ? lower.slice("gold-".length) : lower;
  const bankCode = isBank ? lower.slice("bank-".length).toUpperCase() : null;

  // Skip generic asset queries when on a gold/bank-specific detail page.
  const { data: coins, isLoading } = useQuery({
    queryKey: ["crypto"],
    queryFn: () => fetchCryptoPrices(),
    refetchInterval: 30_000,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    enabled: !isGold && !isBank && !isOil,
  });
  const baseCoin = coins?.find((c) => c.symbol.toLowerCase() === lower);

  // Realtime overlay from Binance WebSocket (~1s cadence). Falls back to the
  // REST snapshot when the coin has no Binance pair or WS fails.
  const liveTick = useBinanceTicker(baseCoin?.id);
  const coin = useMemo(() => {
    if (!baseCoin) return undefined;
    if (!liveTick) return baseCoin;
    const rate = baseCoin.priceUsd > 0 ? baseCoin.priceVnd / baseCoin.priceUsd : 0;
    return {
      ...baseCoin,
      priceUsd: liveTick.priceUsd,
      priceVnd: rate > 0 ? liveTick.priceUsd * rate : baseCoin.priceVnd,
      change24h: liveTick.change24h,
      volume24h: liveTick.volume24h || baseCoin.volume24h,
    };
  }, [baseCoin, liveTick]);

  const { data: golds, isLoading: goldLoading } = useQuery({
    queryKey: ["gold"],
    queryFn: fetchGoldPrices,
    enabled: !isBank && !isOil,
  });
  const gold = golds?.find((g) => g.id.toLowerCase() === goldId);

  const { data: bank, isLoading: bankLoading } = useQuery({ queryKey: ["bank-rates"], queryFn: fetchBankRates, enabled: isBank });
  const bankRow = bank?.items.find((r) => r.code.toUpperCase() === bankCode);

  // Oil (Brent/WTI) — current price + history
  const { data: oilData, isLoading: oilLoading } = useQuery({
    queryKey: ["oil"],
    queryFn: async () => {
      const r = await fetch("/api/public/oil");
      if (!r.ok) throw new Error("oil " + r.status);
      return r.json() as Promise<{ items: any[]; updatedAt: number }>;
    },
    enabled: isOil,
    refetchInterval: 60_000,
  });
  const oil = oilData?.items?.find((o) => o.id === oilId);

  // Fallback lookups for stocks & forex when not a crypto symbol
  const { data: stocks } = useQuery({ queryKey: ["stocks-indices"], queryFn: fetchStockIndices, enabled: !isGold && !isBank && !isOil && !coin && !isLoading });
  const stock = stocks?.find((s) => s.code.toLowerCase() === lower);
  const { data: forex } = useQuery({ queryKey: ["forex"], queryFn: fetchForexRates, enabled: !isGold && !isBank && !isOil && !coin && !stock && !isLoading });
  const fx = forex?.find((r) => r.code.toLowerCase() === lower);

  // Oil history per range tab
  const {
    data: oilHistory,
    isLoading: oilHistLoading,
    isError: oilHistError,
    refetch: refetchOilHist,
  } = useQuery({
    queryKey: ["oil-history", oilId, range],
    queryFn: async () => {
      const r = await fetch(`/api/public/oil-history?id=${oilId}&days=${range}`);
      if (!r.ok) throw new Error("oil-history " + r.status);
      const j = (await r.json()) as { points: { t: number; v: number }[] };
      return j.points ?? [];
    },
    enabled: isOil && !!oilId,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const oilStats = useMemo(() => {
    if (!oilHistory || oilHistory.length < 2) return null;
    const vals = oilHistory.map((p) => p.v);
    const first = vals[0];
    const last = vals[vals.length - 1];
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      changePct: first ? ((last - first) / first) * 100 : 0,
      changeAbs: last - first,
    };
  }, [oilHistory]);

  const others = useMemo(() => coins?.filter((c) => c.id !== coin?.id).slice(0, 5) ?? [], [coins, coin]);

  const {
    data: chart,
    isLoading: chartLoading,
    isFetching: chartFetching,
    isError: chartError,
    error: chartErrorObj,
    refetch: refetchChart,
    dataUpdatedAt: chartUpdatedAt,
  } = useQuery({
    queryKey: ["chart", coin?.id, range],
    queryFn: () => loadChart(coin!.id, range),
    enabled: !!coin,
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const { data: chart7d } = useQuery({
    queryKey: ["chart", coin?.id, "7"],
    queryFn: () => loadChart(coin!.id, "7"),
    enabled: !!coin,
    refetchInterval: 120_000,
  });

  const change7d = useMemo(() => {
    if (!chart7d || chart7d.length < 2) return null;
    const first = chart7d[0].v;
    const last = chart7d[chart7d.length - 1].v;
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [chart7d]);

  const stats = useMemo(() => {
    if (!chart || chart.length === 0) return null;
    const vals = chart.map((p) => p.v);
    return { min: Math.min(...vals), max: Math.max(...vals), first: vals[0], last: vals[vals.length - 1] };
  }, [chart]);

  // Downsample chart points so 30/90-day ranges don't make Recharts redraw
  // thousands of segments on each tab switch. Keep at most ~180 points
  // (enough density for an 800px-wide area chart).
  const chartData = useMemo(() => {
    if (!chart || chart.length === 0) return chart ?? [];
    const MAX = 180;
    if (chart.length <= MAX) return chart;
    const step = chart.length / MAX;
    const out: { t: number; v: number }[] = [];
    for (let i = 0; i < MAX; i++) out.push(chart[Math.floor(i * step)]);
    // Always keep the final point so the latest price is exact.
    out.push(chart[chart.length - 1]);
    return out;
  }, [chart]);

  // Derive chart tint from the chart series itself (first vs last). Using
  // `coin.change24h` would re-tint — and force Recharts to re-render the
  // gradient + area — every 10s when the live ticker updates.
  const chartPositive = stats ? stats.last >= stats.first : true;
  const color = chartPositive ? "var(--up)" : "var(--down)";
  const rangeLabel = range === "1" ? "24 giờ" : range === "7" ? "7 ngày" : range === "30" ? "30 ngày" : "90 ngày";

  const assetCrumb = useMemo(() => {
    if (gold) return [{ label: "Giá vàng", to: "/gia-vang" }, { label: `${gold.brand} · ${gold.type}` }];
    if (bankRow) return [{ label: "Tỷ giá ngân hàng", to: "/ty-gia-ngan-hang" }, { label: `Vietcombank · ${bankRow.code}` }];
    if (oil) return [{ label: "Trang chủ", to: "/" }, { label: `Giá dầu · ${oil.nameVi}` }];
    if (coin) return [{ label: "Giá crypto", to: "/tien-dien-tu" }, { label: symbol.toUpperCase() }];
    if (stock) return [{ label: "Chứng khoán", to: "/chung-khoan" }, { label: symbol.toUpperCase() }];
    if (fx) return [{ label: "Tỷ giá ngoại tệ", to: "/ty-gia-ngoai-te" }, { label: symbol.toUpperCase() }];
    return [{ label: symbol.toUpperCase() }];
  }, [coin, stock, fx, gold, bankRow, oil, symbol]);

  // pair-history asset key resolver
  const historyKey = useMemo(() => {
    if (gold) return gold.id.toLowerCase().startsWith("sjc") ? "g:sjc-1l" : "g:other";
    if (bankRow) return bankRow.code === "VND" ? "vnd" : `f:${bankRow.code.toLowerCase()}`;
    if (fx) return fx.code === "VND" ? "vnd" : `f:${fx.code.toLowerCase()}`;
    return null;
  }, [gold, bankRow, fx]);

  const { isWatched, toggle } = useWatchlist();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[1320px] px-4 md:px-6 py-6 pb-16">
        <div className="rise d1"><Breadcrumbs extra={assetCrumb} /></div>

        {(isLoading || bankLoading || goldLoading || oilLoading) && !coin && !stock && !fx && !gold && !bankRow && !oil && (
          <Skeleton className="h-40 w-full mt-5" />
        )}
        {!isLoading && !bankLoading && !goldLoading && !oilLoading && !coin && !stock && !fx && !gold && !bankRow && !oil && (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold">Tài sản {symbol.toUpperCase()} — Giá &amp; biểu đồ realtime</h1>
            <h2 className="text-lg font-semibold text-muted-foreground mt-3">Không tìm thấy mã "{symbol.toUpperCase()}"</h2>
            <p className="text-muted-foreground mt-2">Trang chi tiết hỗ trợ crypto, chỉ số chứng khoán, ngoại tệ, vàng và tỷ giá ngân hàng.</p>
          </div>
        )}

        {oil && (
          <>
            <AssetHero
              eyebrow="Hàng hoá · Dầu thô"
              logo={<span className="text-2xl">🛢️</span>}
              title={`Giá ${oil.nameVi} hôm nay`}
              pills={[oil.name, oil.exchange]}
              meta={[{ k: "Đơn vị", v: "USD/thùng" }]}
              price={`$${fmtNum(oil.priceUsd, 2)}`}
              subPrice={`${oil.changeAbs >= 0 ? "+" : ""}${fmtNum(oil.changeAbs, 2)} USD`}
              subPriceTone={oil.changeAbs >= 0 ? "up" : "down"}
              changePct={oil.changePct}
              actions={<WatchButton item={{ symbol: lower, label: oil.nameVi, category: "Dầu thô", to: `/tai-san/${lower}` }} />}
            />
            <DataDisclaimer className="mt-3" />

            <KpiStrip
              cells={[
                { k: "Đóng cửa trước", v: `$${fmtNum(oil.prevClose, 2)}` },
                { k: `Cao nhất · ${rangeLabel}`, v: oilStats ? `$${fmtNum(oilStats.max, 2)}` : "—" },
                { k: `Thấp nhất · ${rangeLabel}`, v: oilStats ? `$${fmtNum(oilStats.min, 2)}` : "—" },
                { k: "Biến động phiên", v: `${oil.changePct >= 0 ? "+" : ""}${oil.changePct.toFixed(2)}%`, tone: oil.changePct >= 0 ? "up" : "down" },
                { k: `Biến động · ${rangeLabel}`, v: oilStats ? `${oilStats.changePct >= 0 ? "+" : ""}${oilStats.changePct.toFixed(2)}%` : "—", tone: (oilStats?.changePct ?? 0) >= 0 ? "up" : "down" },
              ]}
            />

            <AdSlot
              placement="in-article"
              format="auto"
              slot={import.meta.env.VITE_ADSENSE_SLOT_ASSET_INARTICLE as string | undefined}
              className="mt-5"
            />

            <Panel className="rise d3 mt-5 relative">

              <SectionLabel
                title={`Lịch sử giá ${oil.nameVi}`}
                badge={<LivePing />}
                loading={oilHistLoading}
                right={<RangeTabs value={range} onValueChange={setRange} />}
              />
              {oilHistLoading && (
                <div className="absolute left-0 right-0 top-[57px] h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 bg-[var(--gold)]/70 animate-[slide_1.2s_ease-in-out_infinite]" />
                </div>
              )}
              <div className="h-80 w-full p-4">
                {oilHistLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : oilHistError ? (
                  <ChartError onRetry={() => refetchOilHist()} />
                ) : !oilHistory || oilHistory.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={oilHistory}>
                      <defs>
                        <linearGradient id={`oil-${oilId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={(oilStats?.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)"} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={(oilStats?.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="t"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickFormatter={(t) =>
                          range === "1"
                            ? new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                            : new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
                        }
                        tickLine={false}
                        axisLine={false}
                        minTickGap={32}
                      />
                      <YAxis dataKey="v" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={70} domain={["auto", "auto"]} tickFormatter={(v) => "$" + fmtNum(v as number, 0)} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} labelFormatter={(t) => new Date(t as number).toLocaleString("vi-VN")} formatter={(v: number) => ["$" + fmtNum(v, 2), "USD/thùng"]} />
                      <Area type="monotone" dataKey="v" stroke={(oilStats?.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)"} strokeWidth={2} fill={`url(#oil-${oilId})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Link to="/" className="mt-5 inline-flex items-center gap-1 text-sm text-gold hover:underline">← Về trang chủ</Link>
          </>
        )}

        {gold && (
          <>
            <AssetHero
              eyebrow="Vàng miếng"
              logo={<span className="text-2xl">🪙</span>}
              title={gold.brand}
              pills={[gold.type, gold.unit]}
              meta={[{ k: "Loại", v: gold.type }, { k: "Đơn vị", v: gold.unit }]}
              price={gold.unit.includes("USD") ? `$${fmtNum(gold.sell, 2)}` : `${fmtTrieu(gold.sell)}`}
              priceSuffix={gold.unit.includes("USD") ? undefined : "tr/chỉ"}
              subPrice={`Bán ra hiện tại${gold.unit.includes("USD") ? "" : ` · ${gold.unit}`}`}
              changePct={gold.changePct}
              actions={<WatchButton item={{ symbol: lower, label: `${gold.brand} ${gold.type}`, category: "Vàng", to: `/tai-san/${lower}` }} />}
            />
            <DataDisclaimer className="mt-3" />

            <KpiStrip
              cells={[
                { k: "Mua vào", v: gold.unit.includes("USD") ? `$${fmtNum(gold.buy, 2)} /oz` : `${fmtTrieu(gold.buy)} tr/chỉ` },
                { k: "Bán ra", v: gold.unit.includes("USD") ? `$${fmtNum(gold.sell, 2)} /oz` : `${fmtTrieu(gold.sell)} tr/chỉ` },
                { k: "Chênh lệch", v: gold.unit.includes("USD") ? `$${fmtNum(gold.sell - gold.buy, 2)} /oz` : `${fmtTrieu(gold.sell - gold.buy)} tr/chỉ` },
                { k: "Biến động", v: `${gold.changePct >= 0 ? "+" : ""}${gold.changePct.toFixed(2)}%`, tone: gold.changePct >= 0 ? "up" : "down" },
                { k: "Đơn vị", v: gold.unit },
              ]}
            />

            <AdSlot
              placement="in-article"
              format="auto"
              slot={import.meta.env.VITE_ADSENSE_SLOT_ASSET_INARTICLE as string | undefined}
              className="mt-5"
            />

            {historyKey && (
              <div className="rise d3 mt-5">
                <PriceHistory
                  assetKey={historyKey}
                  title={`Lịch sử giá ${gold.brand} ${gold.type}`}
                  decimals={gold.unit.includes("USD") ? 2 : 0}
                  useUsd={gold.unit.includes("USD")}
                  unit={gold.unit.includes("USD") ? "$/oz" : "đ/chỉ"}
                />
              </div>
            )}
            <Link to="/gia-vang" className="mt-5 inline-flex items-center gap-1 text-sm text-gold hover:underline">Xem toàn bộ bảng giá vàng →</Link>
          </>
        )}

        {bankRow && (
          <>
            <AssetHero
              eyebrow="Tỷ giá ngân hàng"
              logo={<span className="text-xl font-bold">{bankRow.code.slice(0, 2)}</span>}
              title={`${bankRow.code}/VND`}
              pills={[bankRow.code, "Vietcombank"]}
              meta={[{ k: "Tiền tệ", v: bankRow.name }, { k: "Ngân hàng", v: "Vietcombank" }]}
              price={bankRow.sell ? fmtNum(bankRow.sell, 2) : "—"}
              subPrice={`VND / ${bankRow.code} (bán ra)`}
              actions={<WatchButton item={{ symbol: lower, label: `Vietcombank · ${bankRow.code}`, category: "Ngân hàng", to: `/tai-san/${lower}` }} />}
            />
            <DataDisclaimer className="mt-3" />

            <KpiStrip
              cells={[
                { k: "Mua tiền mặt", v: bankRow.cash ? fmtNum(bankRow.cash, 2) : "—" },
                { k: "Mua chuyển khoản", v: bankRow.transfer ? fmtNum(bankRow.transfer, 2) : "—" },
                { k: "Bán", v: bankRow.sell ? fmtNum(bankRow.sell, 2) : "—" },
                { k: "Mã tiền tệ", v: bankRow.code },
                { k: "Ngân hàng", v: "Vietcombank" },
              ]}
            />

            <AdSlot
              placement="in-article"
              format="auto"
              slot={import.meta.env.VITE_ADSENSE_SLOT_ASSET_INARTICLE as string | undefined}
              className="mt-5"
            />

            {historyKey && (
              <div className="rise d3 mt-5">
                <PriceHistory assetKey={historyKey} title={`Lịch sử tỷ giá ${bankRow.code}/VND`} decimals={2} unit="VND" />
              </div>
            )}
            <Link to="/ty-gia-ngan-hang" className="mt-5 inline-flex items-center gap-1 text-sm text-gold hover:underline">Xem toàn bộ tỷ giá ngân hàng →</Link>
          </>
        )}

        {!coin && stock && (
          <>
            <AssetHero
              eyebrow="Chứng khoán"
              logo={<span className="text-base font-bold">{stock.code.slice(0, 3)}</span>}
              title={stock.name}
              pills={[stock.code, stock.exchange]}
              meta={[{ k: "Sàn", v: stock.exchange }, { k: "Mã", v: stock.code }]}
              price={fmtNum(stock.value, 2)}
              subPrice={`${stock.change >= 0 ? "+" : ""}${fmtNum(stock.change, 2)} điểm`}
              subPriceTone={stock.change >= 0 ? "up" : "down"}
              changePct={stock.changePct}
              actions={<WatchButton item={{ symbol: lower, label: stock.name, category: "Chứng khoán", to: `/tai-san/${lower}` }} />}
            />
            <DataDisclaimer className="mt-3" />

            <KpiStrip
              cells={[
                { k: "Cao trong phiên", v: fmtNum(stock.high, 2) },
                { k: "Thấp trong phiên", v: fmtNum(stock.low, 2) },
                { k: "Khối lượng GD", v: new Intl.NumberFormat("vi-VN").format(stock.volume) },
                { k: "Thay đổi", v: `${stock.change >= 0 ? "+" : ""}${fmtNum(stock.change, 2)}`, tone: stock.change >= 0 ? "up" : "down" },
                { k: "% Thay đổi", v: `${stock.changePct >= 0 ? "+" : ""}${stock.changePct.toFixed(2)}%`, tone: stock.changePct >= 0 ? "up" : "down" },
              ]}
            />

            <AdSlot
              placement="in-article"
              format="auto"
              slot={import.meta.env.VITE_ADSENSE_SLOT_ASSET_INARTICLE as string | undefined}
              className="mt-5"
            />

            <Link to="/chung-khoan" className="mt-5 inline-flex items-center gap-1 text-sm text-gold hover:underline">Xem toàn bộ chỉ số →</Link>
          </>
        )}

        {!coin && !stock && fx && (
          <>
            <AssetHero
              eyebrow="Tỷ giá ngoại tệ"
              logo={<span className="text-base font-bold">{fx.code}</span>}
              title={`${fx.code}/VND`}
              pills={[fx.code]}
              meta={[{ k: "Tiền tệ", v: fx.name }]}
              price={fmtNum(fx.mid, 2)}
              subPrice={`VND / ${fx.code}`}
              changePct={fx.changePct}
              actions={<WatchButton item={{ symbol: lower, label: fx.name, category: "Ngoại tệ", to: `/tai-san/${lower}` }} />}
            />
            <DataDisclaimer className="mt-3" />

            <KpiStrip
              cells={[
                { k: "Mua", v: fmtNum(fx.buy, 2) },
                { k: "Bán", v: fmtNum(fx.sell, 2) },
                { k: "Trung bình", v: fmtNum(fx.mid, 2) },
                { k: "% Thay đổi", v: `${fx.changePct >= 0 ? "+" : ""}${fx.changePct.toFixed(2)}%`, tone: fx.changePct >= 0 ? "up" : "down" },
                { k: "Mã", v: fx.code },
              ]}
            />

            <AdSlot
              placement="in-article"
              format="auto"
              slot={import.meta.env.VITE_ADSENSE_SLOT_ASSET_INARTICLE as string | undefined}
              className="mt-5"
            />

            {historyKey && (
              <div className="rise d3 mt-5">
                <PriceHistory assetKey={historyKey} title={`Lịch sử tỷ giá ${fx.code}/VND`} decimals={2} unit="VND" />
              </div>
            )}
            <Link to="/ty-gia-ngoai-te" className="mt-5 inline-flex items-center gap-1 text-sm text-gold hover:underline">Xem toàn bộ tỷ giá →</Link>
          </>
        )}

        {coin && (
          <>
            <AssetHero
              eyebrow="Tiền điện tử"
              logo={<img src={coin.image} alt={coin.name} className="h-full w-full rounded-full object-cover" />}
              title={coin.name}
              pills={[coin.symbol, "Crypto"]}
              meta={[{ k: "Cặp", v: `${coin.symbol}/USDT` }, { k: "Khung", v: rangeLabel }]}
              price={fmtUSD(coin.priceUsd, coin.priceUsd < 1 ? 4 : 2)}
              subPrice={`≈ ${fmtVND(coin.priceVnd)}`}
              changePct={coin.change24h}
              extra={
                typeof change7d === "number" ? (
                  <div className="hidden md:flex flex-col items-end gap-1 text-xs">
                    <span className="text-muted-foreground uppercase tracking-[0.14em] text-[10px] font-semibold">7 ngày</span>
                    <span className={`text-sm font-bold tabular ${change7d >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                      {change7d >= 0 ? "+" : ""}{change7d.toFixed(2)}%
                    </span>
                  </div>
                ) : null
              }
              actions={<WatchButton item={{ symbol: coin.symbol, label: coin.name, category: "Tiền điện tử", to: `/tai-san/${coin.symbol.toLowerCase()}` }} />}
            />
            <DataDisclaimer className="mt-3" />

            <KpiStrip
              cells={[
                { k: `Cao nhất · ${rangeLabel}`, v: stats ? fmtUSD(stats.max, 2) : "—" },
                { k: `Thấp nhất · ${rangeLabel}`, v: stats ? fmtUSD(stats.min, 2) : "—" },
                { k: "Vốn hoá", v: fmtCompactUSD(coin.marketCap) },
                { k: "KL giao dịch · 24h", v: fmtCompactUSD(coin.volume24h) },
                { k: "Thay đổi · 24h", v: `${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(2)}%`, tone: coin.change24h >= 0 ? "up" : "down" },
                { k: "Biến động · 7N", v: typeof change7d === "number" ? `${change7d >= 0 ? "+" : ""}${change7d.toFixed(2)}%` : "—", tone: (change7d ?? 0) >= 0 ? "up" : "down" },
              ]}
            />

            <AdSlot
              placement="in-article"
              format="auto"
              slot={import.meta.env.VITE_ADSENSE_SLOT_ASSET_INARTICLE as string | undefined}
              className="mt-5"
            />

            <div className="rise d3 mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_348px] gap-5 items-start">
              {/* LEFT column */}
              <div className="flex flex-col gap-5 min-w-0">
                {/* TradingView panel */}
                <Panel>
                  <SectionLabel
                    title={`${coin.symbol} / USDT`}
                    badge={<LivePing />}
                    sub="Binance"
                    right={<span className="text-xs text-muted-foreground">Biểu đồ nâng cao</span>}
                  />
                  {user ? (
                    <TradingViewChart
                      key={`tv-${coin.symbol}-${theme}`}
                      symbol={toTradingViewCryptoSymbol(coin.symbol)}
                      interval="60"
                      height={520}
                      mobileHeight={420}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center gap-4 px-6 py-16 sm:py-24">
                      <div className="h-12 w-12 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5 max-w-md">
                        <h3 className="font-display text-xl">Biểu đồ nâng cao dành cho thành viên</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <RouterLink to="/dang-nhap" className="inline-flex h-9 items-center rounded-md bg-[var(--gold)] px-4 text-sm font-semibold text-[var(--gold-foreground)] hover:opacity-90 transition-opacity">Đăng nhập</RouterLink>
                        <RouterLink to="/dang-ky" className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors">Đăng ký miễn phí</RouterLink>
                      </div>
                    </div>
                  )}
                </Panel>

                {/* Simple area chart (history) */}
                <Panel className="relative">
                  <SectionLabel
                    title="Biểu đồ giá"
                    loading={chartFetching || chartLoading}
                    sub={chartUpdatedAt > 0 && !chartError && !chartFetching ? `cập nhật ${new Date(chartUpdatedAt).toLocaleTimeString("vi-VN")}` : undefined}
                    right={<RangeTabs value={range} onValueChange={setRange} />}
                  />
                  {(chartFetching || chartLoading) && (
                    <div className="absolute left-0 right-0 top-[57px] h-0.5 overflow-hidden">
                      <div className="h-full w-1/3 bg-[var(--gold)]/70 animate-[slide_1.2s_ease-in-out_infinite]" />
                    </div>
                  )}
                  <div className="h-80 w-full p-4">
                    {chartLoading ? (
                      <div className="h-full w-full space-y-3">
                        <Skeleton className="h-[calc(100%-2rem)] w-full" />
                        <Skeleton className="h-6 w-1/3" />
                      </div>
                    ) : chartError ? (
                      <ChartError
                        onRetry={() => refetchChart()}
                        message={chartErrorObj instanceof Error ? chartErrorObj.message : undefined}
                      />
                    ) : !chart || chart.length === 0 ? (
                      <ChartEmpty />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} tickLine={false} axisLine={false} />
                          <YAxis dataKey="v" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={70} domain={["auto", "auto"]} tickFormatter={(v) => "$" + new Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
                          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} labelFormatter={(t) => new Date(t as number).toLocaleString("vi-VN")} formatter={(v: number) => [fmtUSD(v, 2), "Giá"]} />
                          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#ag)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Panel>

                {/* About */}
                <Panel className="rise d4">
                  <SectionLabel title={`Giới thiệu về ${coin.name}`} />
                  <div className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      <strong className="text-foreground">{coin.name} ({coin.symbol})</strong> là tài sản tiền điện tử được giao dịch trên các sàn lớn như Binance, Coinbase và OKX.
                    </p>
                    <p>
                      Vốn hoá hiện tại {fmtCompactUSD(coin.marketCap)} với khối lượng giao dịch 24h đạt {fmtCompactUSD(coin.volume24h)}. Bạn có thể theo dõi sự biến động giá, đặt cảnh báo email và quy đổi sang VND theo tỷ giá thực thời gian.
                    </p>
                  </div>
                </Panel>
              </div>

              {/* RIGHT sidebar */}
              <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
                <Panel className="rise d4">
                  <SectionLabel title="Thống kê thị trường" />
                  <div className="px-5 py-2">
                    <StatRow k="Giá USD" v={fmtUSD(coin.priceUsd, coin.priceUsd < 1 ? 4 : 2)} />
                    <StatRow k="Giá VND" v={fmtVND(coin.priceVnd)} />
                    <StatRow k="Vốn hoá" v={fmtCompactUSD(coin.marketCap)} />
                    <StatRow k="KL giao dịch · 24h" v={fmtCompactUSD(coin.volume24h)} />
                    <StatRow k="Thay đổi · 24h" v={`${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(2)}%`} tone={coin.change24h >= 0 ? "up" : "down"} />
                    {typeof change7d === "number" && (
                      <StatRow k="Biến động · 7N" v={`${change7d >= 0 ? "+" : ""}${change7d.toFixed(2)}%`} tone={change7d >= 0 ? "up" : "down"} />
                    )}
                    {stats && (
                      <>
                        <StatRow k={`Cao nhất · ${rangeLabel}`} v={fmtUSD(stats.max, 2)} />
                        <StatRow k={`Thấp nhất · ${rangeLabel}`} v={fmtUSD(stats.min, 2)} />
                      </>
                    )}
                  </div>
                </Panel>

                {others.length > 0 && (
                  <Panel className="rise d5">
                    <SectionLabel title="Tài sản liên quan" />
                    <div className="divide-y divide-border">
                      {others.map((c) => (
                        <Link
                          key={c.id}
                          to="/tai-san/$symbol"
                          params={{ symbol: c.symbol.toLowerCase() }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                        >
                          <img src={c.image} alt={c.name} className="h-8 w-8 rounded-full flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">{c.name}</div>
                            <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{c.symbol}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold tabular">{fmtUSD(c.priceUsd, 2)}</div>
                            <ChangeBadge value={c.change24h} className="text-[10px] mt-0.5 px-1.5 py-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </Panel>
                )}

                {/* Sidebar ad — chỉ hiện ở desktop (sidebar không xuất hiện trên mobile). */}
                <AdSlot
                  placement="sidebar"
                  format="auto"
                  slot={import.meta.env.VITE_ADSENSE_SLOT_ASSET_SIDEBAR as string | undefined}
                  className="hidden lg:block"
                />
              </aside>
            </div>

            <div className="rise d5 mt-5">
              <CryptoCommunityFeed symbol={coin.symbol} name={coin.name} />
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,var(--gold)_12%,var(--border))] bg-muted/30 p-3 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_28%,var(--border))]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="font-semibold tabular mt-1">{value}</div>
    </div>
  );
}

function RangeTabs({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  const opts = [
    { v: "1", l: "24h" },
    { v: "7", l: "7 ngày" },
    { v: "30", l: "30 ngày" },
    { v: "90", l: "90 ngày" },
  ];
  return (
    <Tabs value={value} onValueChange={onValueChange} className="ml-auto">
      <TabsList className="h-9 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_18%,var(--border))] bg-card/60 p-1 gap-0.5">
        {opts.map((o) => (
          <TabsTrigger
            key={o.v}
            value={o.v}
            className="rounded-xl text-xs px-3 data-[state=active]:bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] data-[state=active]:text-[var(--gold)] data-[state=active]:border data-[state=active]:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] data-[state=active]:shadow-none"
          >
            {o.l}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}


function ChangeCard({ label, value }: { label: string; value: number | null | undefined }) {
  const has = typeof value === "number" && isFinite(value);
  const pos = (value ?? 0) >= 0;
  const tone = !has ? "text-muted-foreground" : pos ? "text-[var(--up)]" : "text-[var(--down)]";
  const bg = !has
    ? "bg-muted/30 border-border"
    : pos
      ? "bg-[color-mix(in_oklab,var(--up)_10%,transparent)] border-[color-mix(in_oklab,var(--up)_30%,var(--border))]"
      : "bg-[color-mix(in_oklab,var(--down)_10%,transparent)] border-[color-mix(in_oklab,var(--down)_30%,var(--border))]";
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular ${tone}`}>
        {has ? `${pos ? "+" : ""}${value!.toFixed(2)}%` : "—"}
      </div>
    </div>
  );
}

function WatchButton({ item }: { item: WatchItem }) {
  const { isWatched, toggle } = useWatchlist();
  const { user } = useAuth();
  const watched = isWatched(item.symbol);
  const qc = useQueryClient();
  const fetchPrefs = useServerFn(getMyWatchAlertPrefs);
  const savePrefs = useServerFn(updateWatchAlertPrefs);

  const { data } = useQuery({
    queryKey: ["watch-alert-prefs"],
    queryFn: () => fetchPrefs(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const current = data?.items.find((i) => i.symbol.toLowerCase() === item.symbol.toLowerCase());
  const emailOn = current?.email_alerts_enabled ?? true;
  const threshold = Number(current?.alert_threshold_pct ?? 5);
  const globalOn = data?.globalEnabled ?? true;
  const [busy, setBusy] = useState(false);

  async function handleSavePrefs(next: { emailEnabled?: boolean; thresholdPct?: number }) {
    if (!user || !watched) return;
    setBusy(true);
    try {
      await savePrefs({
        data: {
          symbol: item.symbol,
          emailEnabled: next.emailEnabled ?? emailOn,
          thresholdPct: next.thresholdPct ?? threshold,
        },
      });
      toast.success("Đã cập nhật cảnh báo");
      qc.invalidateQueries({ queryKey: ["watch-alert-prefs"] });
    } catch (e: any) {
      toast.error("Không thể lưu", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleWatch() {
    toggle(item);
    // Refresh prefs after a moment so popover reflects new state
    setTimeout(() => qc.invalidateQueries({ queryKey: ["watch-alert-prefs"] }), 400);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
            watched
              ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-[var(--gold)]"
              : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-[var(--gold)]/40"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${watched ? "fill-[var(--gold)]" : ""}`} />
          {watched ? "Đang theo dõi" : "Theo dõi"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3 bg-card/60">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tài sản</div>
            <div className="text-sm font-semibold truncate">{item.label}</div>
          </div>
          <button
            type="button"
            onClick={handleToggleWatch}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              watched
                ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-[var(--gold)]"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className={`h-3 w-3 ${watched ? "fill-[var(--gold)]" : ""}`} />
            {watched ? "Đang theo dõi" : "Theo dõi"}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!user ? (
            <div className="text-xs text-muted-foreground space-y-2">
              <p>Mục theo dõi được lưu trên thiết bị này.</p>
              <p>
                <RouterLink to="/dang-nhap" className="text-[var(--gold)] hover:underline">Đăng nhập</RouterLink>{" "}
                để nhận email cảnh báo khi giá biến động mạnh.
              </p>
            </div>
          ) : !watched ? (
            <p className="text-xs text-muted-foreground">
              Thêm vào danh sách theo dõi để bật cảnh báo email khi giá biến động.
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[var(--gold)]" /> Cảnh báo qua email
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gửi khi biến động vượt ngưỡng dưới đây.
                  </p>
                </div>
                <Switch
                  checked={emailOn && globalOn}
                  disabled={busy || !globalOn}
                  onCheckedChange={(v) => handleSavePrefs({ emailEnabled: v })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Ngưỡng biến động</span>
                  <span className="font-semibold text-foreground">≥ {threshold}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 5, 10, 15].map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={busy || !emailOn || !globalOn}
                      onClick={() => handleSavePrefs({ thresholdPct: v })}
                      className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                        threshold === v
                          ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              {!globalOn && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400 flex items-center gap-1.5">
                  <BellOff className="h-3 w-3" /> Bạn đã tạm dừng toàn bộ cảnh báo trong{" "}
                  <RouterLink to="/cai-dat/canh-bao" className="underline">Cài đặt</RouterLink>.
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <RouterLink to="/cai-dat/canh-bao" className="text-xs text-[var(--gold)] hover:underline inline-flex items-center gap-1">
                  <BellRing className="h-3 w-3" /> Quản lý tất cả cảnh báo
                </RouterLink>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}