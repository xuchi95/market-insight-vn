import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SectionCard, LiveDot } from "@/components/site/SectionCard";
import { ChangeBadge } from "@/components/site/ChangeBadge";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCompactUSD, fmtUSD, fmtVND, fmtTime } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/asset/$symbol")({
  head: ({ params }) => {
    const SYM = params.symbol.toUpperCase();
    const SITE = "https://market-insight-vn.lovable.app";
    const URL = `${SITE}/asset/${params.symbol.toLowerCase()}`;
    const TITLE = `Giá ${SYM} hôm nay — Biểu đồ ${SYM}/USD realtime | MarketWatch`;
    const DESC = `Giá ${SYM} hôm nay cập nhật realtime: biến động 24h, vốn hoá thị trường, khối lượng giao dịch và biểu đồ giá ${SYM}/USD chi tiết.`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { name: "keywords", content: `giá ${SYM.toLowerCase()}, giá ${SYM.toLowerCase()} hôm nay, ${SYM.toLowerCase()}/usd, biểu đồ ${SYM.toLowerCase()}, vốn hoá ${SYM.toLowerCase()}` },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:url", content: URL },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "vi_VN" },
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
              { "@type": "ListItem", position: 2, name: "Crypto", item: `${SITE}/crypto` },
              { "@type": "ListItem", position: 3, name: SYM, item: URL },
            ],
          }),
        },
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
  const { symbol } = useParams({ from: "/asset/$symbol" });
  const [range, setRange] = useState("7");

  const { data: coins, isLoading } = useQuery({ queryKey: ["crypto"], queryFn: () => fetchCryptoPrices(), refetchInterval: 15000 });
  const coin = coins?.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase());
  const others = useMemo(() => coins?.filter((c) => c.id !== coin?.id).slice(0, 5) ?? [], [coins, coin]);

  const { data: chart } = useQuery({
    queryKey: ["chart", coin?.id, range],
    queryFn: () => loadChart(coin!.id, range),
    enabled: !!coin,
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    if (!chart || chart.length === 0) return null;
    const vals = chart.map((p) => p.v);
    return { min: Math.min(...vals), max: Math.max(...vals), first: vals[0], last: vals[vals.length - 1] };
  }, [chart]);

  const positive = (coin?.change24h ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Quay lại dashboard</Link>

        {isLoading && <Skeleton className="h-40 w-full" />}
        {!isLoading && !coin && (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold">Không tìm thấy tài sản "{symbol.toUpperCase()}"</h1>
            <p className="text-muted-foreground mt-2">Hiện tại trang chi tiết hỗ trợ các coin có trong danh sách dashboard.</p>
          </div>
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
              </div>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Cao nhất 24h" value={stats ? fmtUSD(stats.max, 2) : "—"} />
                <Stat label="Thấp nhất 24h" value={stats ? fmtUSD(stats.min, 2) : "—"} />
                <Stat label="Vốn hoá" value={fmtCompactUSD(coin.marketCap)} />
                <Stat label="Volume 24h" value={fmtCompactUSD(coin.volume24h)} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <h2 className="font-bold">Biểu đồ giá</h2>
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
                          <Link to="/asset/$symbol" params={{ symbol: c.symbol.toLowerCase() }} className="flex items-center gap-3">
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