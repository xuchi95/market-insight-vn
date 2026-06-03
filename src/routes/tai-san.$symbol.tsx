import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
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
import { Star, BellRing, BellOff, Loader2, Mail, AlertTriangle, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Link as RouterLink } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { updateWatchAlertPrefs, getMyWatchAlertPrefs } from "@/lib/watchlist/alerts.functions";
import { toast } from "sonner";
import { TradingViewChart, toTradingViewCryptoSymbol } from "@/components/site/TradingViewChart";

export const Route = createFileRoute("/tai-san/$symbol")({
  head: ({ params }) => {
    const SYM = params.symbol.toUpperCase();
    const SITE = "https://marketwatch.vn";
    const slug = params.symbol.toLowerCase();
    const URL = `${SITE}/tai-san/${slug}`;

    // Oil (Brent/WTI) — SEO chuyên biệt
    const isOilBrent = slug === "oil-brent";
    const isOilWti = slug === "oil-wti";
    const isOil = isOilBrent || isOilWti;

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
    } else {
      TITLE = `Giá ${SYM} hôm nay — Biểu đồ ${SYM}/USD realtime | MarketWatch`;
      DESC = `Giá ${SYM} hôm nay cập nhật realtime: biến động 24h, vốn hoá thị trường, khối lượng giao dịch và biểu đồ giá ${SYM}/USD chi tiết.`;
      KEYWORDS = `giá ${SYM.toLowerCase()}, giá ${SYM.toLowerCase()} hôm nay, ${SYM.toLowerCase()}/usd, biểu đồ ${SYM.toLowerCase()}, vốn hoá ${SYM.toLowerCase()}`;
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
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
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

  const lower = symbol.toLowerCase();
  const isGold = lower.startsWith("gold-");
  const isBank = lower.startsWith("bank-");
  const isOil = lower === "oil-brent" || lower === "oil-wti";
  const oilId = isOil ? (lower === "oil-brent" ? "brent" : "wti") : null;
  const goldId = isGold ? lower.slice("gold-".length) : null;
  const bankCode = isBank ? lower.slice("bank-".length).toUpperCase() : null;

  // Skip generic asset queries when on a gold/bank-specific detail page.
  const { data: coins, isLoading } = useQuery({
    queryKey: ["crypto"],
    queryFn: () => fetchCryptoPrices(),
    refetchInterval: 60_000,
    enabled: !isGold && !isBank && !isOil,
  });
  const coin = coins?.find((c) => c.symbol.toLowerCase() === lower);

  const { data: golds } = useQuery({ queryKey: ["gold"], queryFn: fetchGoldPrices, enabled: isGold });
  const gold = golds?.find((g) => g.id.toLowerCase() === goldId);

  const { data: bank } = useQuery({ queryKey: ["bank-rates"], queryFn: fetchBankRates, enabled: isBank });
  const bankRow = bank?.items.find((r) => r.code.toUpperCase() === bankCode);

  // Oil (Brent/WTI) — current price + history
  const { data: oilData } = useQuery({
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

  const positive = (coin?.change24h ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";
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
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs extra={assetCrumb} />

        {isLoading && !isGold && !isBank && <Skeleton className="h-40 w-full" />}
        {!isLoading && !coin && !stock && !fx && !gold && !bankRow && !oil && (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold">Không tìm thấy tài sản "{symbol.toUpperCase()}"</h1>
            <p className="text-muted-foreground mt-2">Trang chi tiết hỗ trợ crypto, chỉ số chứng khoán, ngoại tệ, vàng và tỷ giá ngân hàng.</p>
          </div>
        )}

        {oil && (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gold">Giá {oil.nameVi} hôm nay</h1>
                  <div className="text-sm text-muted-foreground mt-1">{oil.name} · Sàn {oil.exchange} · USD/thùng · Cập nhật realtime</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-4xl font-bold tabular tracking-tight">${fmtNum(oil.priceUsd, 2)}</div>
                  <div className={`text-sm tabular ${oil.changeAbs >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                    {oil.changeAbs >= 0 ? "+" : ""}{fmtNum(oil.changeAbs, 2)} USD
                  </div>
                </div>
                <ChangeBadge value={oil.changePct} className="text-sm px-3 py-1" />
                <WatchButton item={{ symbol: lower, label: oil.nameVi, category: "Dầu thô", to: `/tai-san/${lower}` }} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Đóng cửa trước" value={`$${fmtNum(oil.prevClose, 2)}`} />
                <Stat label={`Cao nhất (${rangeLabel})`} value={oilStats ? `$${fmtNum(oilStats.max, 2)}` : "—"} />
                <Stat label={`Thấp nhất (${rangeLabel})`} value={oilStats ? `$${fmtNum(oilStats.min, 2)}` : "—"} />
                <Stat label="Cập nhật" value={fmtTime(oil.updatedAt)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ChangeCard label="Biến động phiên" value={oil.changePct} />
              <ChangeCard label={`Biến động ${rangeLabel}`} value={oilStats?.changePct ?? null} />
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <h2 className="font-bold">Lịch sử giá {oil.nameVi}</h2>
                <Tabs value={range} onValueChange={setRange} className="ml-auto">
                  <TabsList className="h-9">
                    <TabsTrigger value="1">24h</TabsTrigger>
                    <TabsTrigger value="7">7 ngày</TabsTrigger>
                    <TabsTrigger value="30">30 ngày</TabsTrigger>
                    <TabsTrigger value="90">90 ngày</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="h-80 w-full p-4">
                {oilHistLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : oilHistError ? (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center">
                    <AlertTriangle className="h-8 w-8 text-[var(--down)]" />
                    <div className="text-sm font-semibold">Không tải được biểu đồ</div>
                    <button
                      type="button"
                      onClick={() => refetchOilHist()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
                    >
                      <RefreshCw className="h-3 w-3" /> Thử lại
                    </button>
                  </div>
                ) : !oilHistory || oilHistory.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                    Chưa có dữ liệu lịch sử.
                  </div>
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
                      <YAxis
                        dataKey="v"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => "$" + fmtNum(v as number, 0)}
                      />
                      <Tooltip
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                        labelFormatter={(t) => new Date(t as number).toLocaleString("vi-VN")}
                        formatter={(v: number) => ["$" + fmtNum(v, 2), "USD/thùng"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={(oilStats?.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)"}
                        strokeWidth={2}
                        fill={`url(#oil-${oilId})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <Link to="/" className="text-sm text-gold hover:underline inline-flex items-center gap-1">← Về trang chủ</Link>
          </>
        )}

        {gold && (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gold">{gold.brand}</h1>
                  <div className="text-sm text-muted-foreground mt-1">{gold.type} · {gold.unit}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-4xl font-bold tabular tracking-tight">
                    {gold.unit.includes("USD") ? `$${fmtNum(gold.sell, 2)}` : `${fmtTrieu(gold.sell)} tr`}
                  </div>
                  <div className="text-sm text-muted-foreground">Giá bán ra hiện tại</div>
                </div>
                <ChangeBadge value={gold.changePct} className="text-sm px-3 py-1" />
                <WatchButton item={{ symbol: lower, label: `${gold.brand} ${gold.type}`, category: "Vàng", to: `/tai-san/${lower}` }} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Mua vào" value={gold.unit.includes("USD") ? `$${fmtNum(gold.buy, 2)}` : `${fmtTrieu(gold.buy)} tr`} />
                <Stat label="Bán ra" value={gold.unit.includes("USD") ? `$${fmtNum(gold.sell, 2)}` : `${fmtTrieu(gold.sell)} tr`} />
                <Stat label="Chênh lệch" value={gold.unit.includes("USD") ? `$${fmtNum(gold.sell - gold.buy, 2)}` : `${fmtTrieu(gold.sell - gold.buy)} tr`} />
                <Stat label="Cập nhật" value={fmtTime(gold.updatedAt)} />
              </div>
            </div>
            {historyKey && <PriceHistory assetKey={historyKey} title={`Lịch sử giá ${gold.brand} ${gold.type}`} decimals={0} />}
            <Link to="/gia-vang" className="text-sm text-gold hover:underline inline-flex items-center gap-1">Xem toàn bộ bảng giá vàng →</Link>
          </>
        )}

        {bankRow && (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gold">{bankRow.code}/VND</h1>
                  <div className="text-sm text-muted-foreground mt-1">{bankRow.name} · Niêm yết Vietcombank</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-4xl font-bold tabular tracking-tight">{bankRow.sell ? fmtNum(bankRow.sell, 2) : "—"}</div>
                  <div className="text-sm text-muted-foreground">VND / {bankRow.code} (bán ra)</div>
                </div>
                <WatchButton item={{ symbol: lower, label: `Vietcombank · ${bankRow.code}`, category: "Ngân hàng", to: `/tai-san/${lower}` }} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Mua tiền mặt" value={bankRow.cash ? fmtNum(bankRow.cash, 2) : "—"} />
                <Stat label="Mua chuyển khoản" value={bankRow.transfer ? fmtNum(bankRow.transfer, 2) : "—"} />
                <Stat label="Bán" value={bankRow.sell ? fmtNum(bankRow.sell, 2) : "—"} />
                <Stat label="Cập nhật" value={fmtTime(bankRow.updatedAt)} />
              </div>
            </div>
            {historyKey && <PriceHistory assetKey={historyKey} title={`Lịch sử tỷ giá ${bankRow.code}/VND`} decimals={2} />}
            <Link to="/ty-gia-ngan-hang" className="text-sm text-gold hover:underline inline-flex items-center gap-1">Xem toàn bộ tỷ giá ngân hàng →</Link>
          </>
        )}

        {!coin && stock && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gold">{stock.name}</h1>
                <div className="text-sm text-muted-foreground mt-1">Sàn {stock.exchange} · Mã {stock.code}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-4xl font-bold tabular tracking-tight">{fmtNum(stock.value, 2)}</div>
                <div className={`text-sm tabular ${stock.change >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                  {stock.change >= 0 ? "+" : ""}{fmtNum(stock.change, 2)} điểm
                </div>
              </div>
              <ChangeBadge value={stock.changePct} className="text-sm px-3 py-1" />
              <WatchButton item={{ symbol: lower, label: stock.name, category: "Chứng khoán", to: `/tai-san/${lower}` }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Stat label="Cao trong phiên" value={fmtNum(stock.high, 2)} />
              <Stat label="Thấp trong phiên" value={fmtNum(stock.low, 2)} />
              <Stat label="Khối lượng GD" value={new Intl.NumberFormat("vi-VN").format(stock.volume)} />
              <Stat label="Cập nhật" value={fmtTime(stock.updatedAt)} />
            </div>
            <Link to="/chung-khoan" className="text-sm text-gold hover:underline inline-flex items-center gap-1">Xem toàn bộ chỉ số →</Link>
          </div>
        )}

        {!coin && !stock && fx && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gold">{fx.code}/VND</h1>
                <div className="text-sm text-muted-foreground mt-1">{fx.name}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-4xl font-bold tabular tracking-tight">{fmtNum(fx.mid, 2)}</div>
                <div className="text-sm text-muted-foreground">VND / {fx.code}</div>
              </div>
              <ChangeBadge value={fx.changePct} className="text-sm px-3 py-1" />
              <WatchButton item={{ symbol: lower, label: fx.name, category: "Ngoại tệ", to: `/tai-san/${lower}` }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Stat label="Mua" value={fmtNum(fx.buy, 2)} />
              <Stat label="Bán" value={fmtNum(fx.sell, 2)} />
              <Stat label="Cập nhật" value={fmtTime(fx.updatedAt)} />
            </div>
          </div>
        )}
        {!coin && !stock && fx && historyKey && (
          <PriceHistory assetKey={historyKey} title={`Lịch sử tỷ giá ${fx.code}/VND`} decimals={2} />
        )}
        {!coin && !stock && fx && (
          <Link to="/ty-gia-ngoai-te" className="text-sm text-gold hover:underline inline-flex items-center gap-1">Xem toàn bộ tỷ giá →</Link>
        )}

        {coin && (
          <>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center gap-4">
                <img src={coin.image} alt={coin.name} className="h-14 w-14 rounded-full" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{coin.name} <span className="text-muted-foreground text-xl font-medium">{coin.symbol}</span></h1>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1"><LiveDot /> Giá thị trường realtime</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-4xl font-bold tabular tracking-tight">{fmtUSD(coin.priceUsd, coin.priceUsd < 1 ? 4 : 2)}</div>
                  <div className="text-sm text-muted-foreground tabular">{fmtVND(coin.priceVnd)}</div>
                </div>
                <ChangeBadge value={coin.change24h} className="text-sm px-3 py-1" />
                <WatchButton item={{ symbol: coin.symbol, label: coin.name, category: "Tiền điện tử", to: `/tai-san/${coin.symbol.toLowerCase()}` }} />
              </div>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label={`Cao nhất (${rangeLabel})`} value={stats ? fmtUSD(stats.max, 2) : "—"} />
                <Stat label={`Thấp nhất (${rangeLabel})`} value={stats ? fmtUSD(stats.min, 2) : "—"} />
                <Stat label="Vốn hoá" value={fmtCompactUSD(coin.marketCap)} />
                <Stat label="Volume 24h" value={fmtCompactUSD(coin.volume24h)} />
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Thay đổi 24h" value={`${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(2)}%`} />
                <Stat label="Khung thời gian" value={rangeLabel} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ChangeCard label="Biến động 24h" value={coin.change24h} />
              <ChangeCard label="Biến động 7 ngày" value={change7d} />
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <h2 className="font-bold">Biểu đồ nâng cao · {coin.symbol}/USDT</h2>
                <LiveDot />
              </div>
              <TradingViewChart
                symbol={toTradingViewCryptoSymbol(coin.symbol)}
                interval="60"
                height={680}
                mobileHeight={480}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <h2 className="font-bold">Biểu đồ giá</h2>
                {chartFetching && !chartLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Đang cập nhật" />
                )}
                {chartUpdatedAt > 0 && !chartError && (
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Cập nhật {new Date(chartUpdatedAt).toLocaleTimeString("vi-VN")}
                  </span>
                )}
                <Tabs value={range} onValueChange={setRange} className="ml-auto">
                  <TabsList className="h-9">
                    <TabsTrigger value="1">24h</TabsTrigger>
                    <TabsTrigger value="7">7 ngày</TabsTrigger>
                    <TabsTrigger value="30">30 ngày</TabsTrigger>
                    <TabsTrigger value="90">90 ngày</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="h-80 w-full p-4">
                {chartLoading ? (
                  <div className="h-full w-full space-y-3">
                    <Skeleton className="h-[calc(100%-2rem)] w-full" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                ) : chartError ? (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center">
                    <AlertTriangle className="h-8 w-8 text-[var(--down)]" />
                    <div className="text-sm font-semibold">Không tải được biểu đồ</div>
                    <div className="text-xs text-muted-foreground max-w-xs">
                      {chartErrorObj instanceof Error ? chartErrorObj.message : "Lỗi không xác định"}. Vui lòng thử lại.
                    </div>
                    <button
                      type="button"
                      onClick={() => refetchChart()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
                    >
                      <RefreshCw className="h-3 w-3" /> Thử lại
                    </button>
                  </div>
                ) : !chart || chart.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                    Chưa có dữ liệu lịch sử cho khung thời gian này.
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
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
                    <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#ag)" />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>

            <SectionCard title="Tài sản liên quan" description="So sánh với các coin có vốn hoá lớn">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Coin</th>
                      <th className="text-right px-4 py-3">Giá</th>
                      <th className="text-right px-4 py-3">24h</th>
                      <th className="text-right px-4 py-3 hidden md:table-cell">Vốn hoá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {others.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link to="/tai-san/$symbol" params={{ symbol: c.symbol.toLowerCase() }} className="flex items-center gap-3">
                            <img src={c.image} alt={c.name} className="h-6 w-6 rounded-full" />
                            <div className="font-semibold">{c.name} <span className="text-muted-foreground text-xs">{c.symbol}</span></div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular">{fmtUSD(c.priceUsd, 2)}</td>
                        <td className="px-4 py-3 text-right"><ChangeBadge value={c.change24h} /></td>
                        <td className="px-4 py-3 text-right tabular text-muted-foreground hidden md:table-cell">{fmtCompactUSD(c.marketCap)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="text-xs text-muted-foreground">Cập nhật lần cuối: {fmtTime(Date.now())}</div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular mt-1">{value}</div>
    </div>
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