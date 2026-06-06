import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ExternalLink, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ChangeBadge } from "@/components/site/ChangeBadge";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { SectionCard } from "@/components/site/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtNum, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const SITE = "https://marketwatch.vn";

interface VnStock {
  symbol: string;
  companyName: string | null;
  shortName: string | null;
  industry: string | null;
  exchange: string | null;
  website: string | null;
  established: number | null;
  employees: number | null;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  volume: number | null;
  pe: number | null;
  eps: number | null;
  roe: number | null;
  roa: number | null;
  bvps: number | null;
  pb: number | null;
  marketCap: number | null;
  fetchedAt: number;
  source: string;
}

interface ChartPayload { points: { t: number; v: number }[]; source: string }

async function fetchStock(sym: string): Promise<VnStock> {
  const r = await fetch(`/api/public/vn-stock?symbol=${encodeURIComponent(sym)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function fetchChart(sym: string, days: number): Promise<ChartPayload> {
  const r = await fetch(`/api/public/vn-stock-chart?symbol=${encodeURIComponent(sym)}&days=${days}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function fmtPrice(v: number | null): string {
  if (v === null) return "—";
  // TCBS trả về giá theo nghìn VND/cổ phiếu (vd 78.5 = 78,500đ). Hiển thị nghìn VND.
  return fmtNum(v, 2);
}
function fmtMarketCap(v: number | null): string {
  if (v === null) return "—";
  // marketCap từ TCBS: tỷ VND
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} triệu tỷ VND`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)} nghìn tỷ VND`;
  return `${v.toFixed(0)} tỷ VND`;
}
function fmtPct(v: number | null, digits = 2): string {
  if (v === null) return "—";
  return `${v.toFixed(digits)}%`;
}
function fmtInt(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("vi-VN");
}

export const Route = createFileRoute("/co-phieu/$symbol")({
  head: ({ params }) => {
    const SYM = params.symbol.toUpperCase();
    const slug = params.symbol.toLowerCase();
    const URL = `${SITE}/co-phieu/${slug}`;
    const TITLE = `Cổ phiếu ${SYM} hôm nay — Giá, P/E, EPS, biểu đồ ${SYM} realtime | MarketWatch`;
    const DESC = `Giá cổ phiếu ${SYM} hôm nay cập nhật realtime: biến động phiên, P/E, EPS, ROE, vốn hoá thị trường và biểu đồ kỹ thuật ${SYM} theo phiên 7-365 ngày.`;
    const KEYWORDS = `cổ phiếu ${SYM.toLowerCase()}, giá ${SYM.toLowerCase()}, ${SYM.toLowerCase()} hôm nay, biểu đồ ${SYM.toLowerCase()}, p/e ${SYM.toLowerCase()}, eps ${SYM.toLowerCase()}, vốn hoá ${SYM.toLowerCase()}, ${SYM.toLowerCase()} hose`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { name: "keywords", content: KEYWORDS },
        { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:url", content: URL },
        { property: "og:type", content: "article" },
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
              { "@type": "ListItem", position: 2, name: "Chứng khoán", item: `${SITE}/chung-khoan` },
              { "@type": "ListItem", position: 3, name: `Cổ phiếu ${SYM}`, item: URL },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Giá cổ phiếu ${SYM} hôm nay là bao nhiêu?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Giá cổ phiếu ${SYM} được cập nhật realtime từ TCBS và VNDirect, hiển thị theo nghìn VND/cổ phiếu kèm % thay đổi so với phiên trước trên MarketWatch.`,
                },
              },
              {
                "@type": "Question",
                name: `P/E và EPS của ${SYM} là gì?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `P/E (Price-to-Earnings) là tỷ số giữa giá cổ phiếu và lợi nhuận trên mỗi cổ phần (EPS). P/E thấp có thể là cổ phiếu rẻ hoặc doanh nghiệp đang gặp vấn đề; cần so sánh với trung bình ngành.`,
                },
              },
              {
                "@type": "Question",
                name: `Dữ liệu cổ phiếu ${SYM} lấy từ đâu?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Dữ liệu giá, khối lượng và chỉ số tài chính được tổng hợp từ TCBS (apipubaws.tcbs.com.vn) và VNDirect (dchart-api.vndirect.com.vn), cập nhật mỗi 2-5 phút trong giờ giao dịch.`,
                },
              },
            ],
          }),
        },
      ],
    };
  },
  component: StockDetail,
});

const RANGES = [
  { label: "7N", days: 7 },
  { label: "30N", days: 30 },
  { label: "90N", days: 90 },
  { label: "180N", days: 180 },
  { label: "1N", days: 365 },
];

function StockDetail() {
  const { symbol } = useParams({ from: "/co-phieu/$symbol" });
  const SYM = symbol.toUpperCase();
  const [days, setDays] = useState(90);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["vn-stock", SYM],
    queryFn: () => fetchStock(SYM),
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: chart, isLoading: chartLoading, isError: chartError, refetch: refetchChart } = useQuery({
    queryKey: ["vn-stock-chart", SYM, days],
    queryFn: () => fetchChart(SYM, days),
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const stats = useMemo(() => {
    if (!chart?.points || chart.points.length < 2) return null;
    const vals = chart.points.map((p) => p.v);
    const first = vals[0];
    const last = vals[vals.length - 1];
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      changePct: first ? ((last - first) / first) * 100 : 0,
    };
  }, [chart]);

  const positive = (data?.changePct ?? 0) >= 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs extra={[{ label: "Chứng khoán", to: "/chung-khoan" }, { label: `Cổ phiếu ${SYM}` }]} />

        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold">Không tải được dữ liệu cổ phiếu {SYM}</h1>
            <p className="text-muted-foreground">Mã có thể chưa được hỗ trợ, hoặc nguồn TCBS tạm thời không phản hồi.</p>
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </button>
          </div>
        )}

        {data && (
          <>
            <header className="rounded-2xl border border-border bg-card p-6 space-y-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gold">
                    Cổ phiếu {SYM}
                    {data.shortName && <span className="text-foreground"> · {data.shortName}</span>}
                  </h1>
                  <div className="text-sm text-muted-foreground mt-1">
                    {data.companyName ?? "—"}
                    {data.exchange && <> · Sàn <strong>{data.exchange}</strong></>}
                    {data.industry && <> · Ngành {data.industry}</>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold tabular-nums tracking-tight">{fmtPrice(data.price)}</div>
                  <div className={cn("text-sm tabular-nums", positive ? "text-[var(--up)]" : "text-[var(--down)]")}>
                    {data.change !== null && (data.change >= 0 ? "+" : "")}{data.change !== null ? fmtNum(data.change, 2) : "—"} ·{" "}
                    <ChangeBadge value={data.changePct ?? 0} className="text-xs px-2 py-0.5 inline-flex" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">nghìn VND/cổ phiếu · cập nhật {fmtTime(data.fetchedAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Mở cửa" value={fmtPrice(data.open)} />
                <Stat label="Tham chiếu" value={fmtPrice(data.prevClose)} />
                <Stat label="Cao nhất" value={fmtPrice(data.high)} />
                <Stat label="Thấp nhất" value={fmtPrice(data.low)} />
                <Stat label="KLGD" value={fmtInt(data.volume)} />
                <Stat label="Vốn hoá" value={fmtMarketCap(data.marketCap)} />
                <Stat label="P/E" value={data.pe !== null ? data.pe.toFixed(2) : "—"} highlight />
                <Stat label="EPS" value={data.eps !== null ? fmtNum(data.eps, 0) : "—"} highlight />
              </div>
            </header>

            <SectionCard title={`Biểu đồ giá ${SYM}`} description={`Lịch sử giá đóng cửa ${days} phiên gần nhất`}>
              <div className="p-4 space-y-4">
                <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                  <TabsList className="h-9">
                    {RANGES.map((r) => (
                      <TabsTrigger key={r.days} value={String(r.days)}>{r.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="h-80 w-full">
                  {chartLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : chartError || !chart?.points?.length ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-[var(--down)]" />
                      <div className="text-sm font-semibold">Không tải được biểu đồ</div>
                      <button onClick={() => refetchChart()} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/40">
                        <RefreshCw className="h-3 w-3" /> Thử lại
                      </button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chart.points}>
                        <defs>
                          <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                        <XAxis
                          dataKey="t"
                          tickFormatter={(t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          stroke="var(--muted-foreground)"
                          fontSize={11}
                        />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
                        <Tooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                          labelFormatter={(t) => new Date(t).toLocaleDateString("vi-VN")}
                          formatter={(v: number) => [fmtNum(v, 2), `${SYM}`]}
                        />
                        <Area type="monotone" dataKey="v" stroke="var(--gold)" strokeWidth={2} fill="url(#stockGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {stats && (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <Stat label={`Cao nhất ${days}N`} value={fmtNum(stats.max, 2)} />
                    <Stat label={`Thấp nhất ${days}N`} value={fmtNum(stats.min, 2)} />
                    <Stat label={`Biến động ${days}N`} value={`${stats.changePct >= 0 ? "+" : ""}${stats.changePct.toFixed(2)}%`} />
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Chỉ số tài chính cơ bản">
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="P/E" value={data.pe !== null ? data.pe.toFixed(2) : "—"} />
                <Stat label="EPS (VND)" value={data.eps !== null ? fmtNum(data.eps, 0) : "—"} />
                <Stat label="P/B" value={data.pb !== null ? data.pb.toFixed(2) : "—"} />
                <Stat label="BVPS (VND)" value={data.bvps !== null ? fmtNum(data.bvps, 0) : "—"} />
                <Stat label="ROE" value={fmtPct(data.roe !== null ? data.roe * 100 : null)} />
                <Stat label="ROA" value={fmtPct(data.roa !== null ? data.roa * 100 : null)} />
                <Stat label="Vốn hoá" value={fmtMarketCap(data.marketCap)} />
                <Stat label="Số nhân viên" value={fmtInt(data.employees)} />
              </div>
            </SectionCard>

            {data.website && (
              <div className="text-sm text-muted-foreground">
                Website công ty:{" "}
                <a href={data.website.startsWith("http") ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  {data.website} <ExternalLink className="h-3 w-3" />
                </a>
                {data.established && <> · Thành lập {data.established}</>}
              </div>
            )}

            <section className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold tracking-tight">Về cổ phiếu {SYM}</h2>
              <p className="text-muted-foreground">
                <strong>{SYM}</strong>{data.companyName ? ` (${data.companyName})` : ""} là cổ phiếu niêm yết trên sàn{" "}
                <strong>{data.exchange ?? "HOSE/HNX/UPCOM"}</strong>
                {data.industry ? `, thuộc ngành ${data.industry}` : ""}. Trang này cập nhật <strong>giá {SYM} realtime</strong>, các chỉ số định giá quan trọng (<strong>P/E</strong>, <strong>EPS</strong>, <strong>P/B</strong>, <strong>ROE</strong>, <strong>ROA</strong>) và <strong>biểu đồ kỹ thuật {SYM}</strong> 7-365 phiên gần nhất.
              </p>
              <p className="text-muted-foreground">
                Theo dõi đồng thời với <Link to="/chung-khoan" className="text-primary hover:underline">chỉ số VN-Index</Link>,{" "}
                <Link to="/vi-mo-viet-nam" className="text-primary hover:underline">vĩ mô Việt Nam</Link> và{" "}
                <Link to="/lich-kinh-te" className="text-primary hover:underline">lịch kinh tế</Link> để đánh giá bối cảnh đầu tư.
              </p>
              <p className="text-xs text-muted-foreground/70 italic">
                Nguồn dữ liệu: {data.source} + VNDirect dchart. Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
              </p>
            </section>

            <RelatedLinks current="stocks" />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border bg-card p-3", highlight ? "border-[var(--gold)]/60 bg-[var(--gold)]/5" : "border-border")}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-base font-bold tabular-nums mt-1", highlight && "text-[var(--gold)]")}>{value}</div>
    </div>
  );
}
