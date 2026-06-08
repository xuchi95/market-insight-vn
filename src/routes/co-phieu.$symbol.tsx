import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { AssetHero, KpiStrip, Panel, SectionLabel, StatRow, ChartError, ChartEmpty } from "@/components/site/AssetShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtNum, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isVnMarketOpen } from "@/lib/vn-market";
import { AnimatedNumber } from "@/components/site/AnimatedNumber";

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

  // Trong giờ giao dịch HOSE (T2-T6, 9:00-11:30 và 13:00-15:00 giờ VN) poll
  // mỗi 15s để giá nhảy gần realtime. Ngoài giờ giảm xuống 60s để tiết kiệm.
  const [marketOpen, setMarketOpen] = useState(() => isVnMarketOpen());
  useEffect(() => {
    const id = setInterval(() => setMarketOpen(isVnMarketOpen()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["vn-stock", SYM],
    queryFn: () => fetchStock(SYM),
    refetchInterval: marketOpen ? 15_000 : 60_000,
    refetchOnWindowFocus: true,
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
            <AssetHero
              eyebrow="Cổ phiếu Việt Nam"
              logo={<span className="text-base font-extrabold tracking-tight">{SYM.slice(0, 3)}</span>}
              title={data.shortName || data.companyName || `Cổ phiếu ${SYM}`}
              pills={[SYM, data.exchange ?? "HOSE"]}
              meta={[
                ...(data.companyName ? [{ k: "Công ty", v: data.companyName }] : []),
                ...(data.industry ? [{ k: "Ngành", v: data.industry }] : []),
                { k: "Cập nhật", v: fmtTime(data.fetchedAt) },
              ]}
              price={fmtPrice(data.price)}
              priceSuffix="nghìn ₫"
              changePct={data.changePct}
              subPrice={
                data.change !== null
                  ? `${data.change >= 0 ? "+" : ""}${fmtNum(data.change, 2)} so với tham chiếu`
                  : undefined
              }
              subPriceTone={positive ? "up" : "down"}
            />

            <KpiStrip
              cells={[
                { k: "Mở cửa", v: fmtPrice(data.open) },
                { k: "Tham chiếu", v: fmtPrice(data.prevClose) },
                { k: "Cao nhất phiên", v: fmtPrice(data.high) },
                { k: "Thấp nhất phiên", v: fmtPrice(data.low) },
                { k: "Khối lượng", v: fmtInt(data.volume) },
                { k: "Vốn hoá", v: fmtMarketCap(data.marketCap) },
              ]}
            />

            <div className="rise d3 mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_348px] gap-5 items-start">
              {/* LEFT column */}
              <div className="flex flex-col gap-5 min-w-0">
                <Panel>
                  <SectionLabel
                    title={`Biểu đồ giá ${SYM}`}
                    sub={chart?.source}
                    right={
                      <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))} className="ml-auto">
                        <TabsList className="h-9 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_18%,var(--border))] bg-card/60 p-1 gap-0.5">
                          {RANGES.map((r) => (
                            <TabsTrigger
                              key={r.days}
                              value={String(r.days)}
                              className="rounded-xl text-xs px-3 data-[state=active]:bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] data-[state=active]:text-[var(--gold)] data-[state=active]:border data-[state=active]:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] data-[state=active]:shadow-none"
                            >
                              {r.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    }
                  />
                  <div className="h-80 w-full p-4">
                    {chartLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : chartError ? (
                      <ChartError onRetry={() => refetchChart()} />
                    ) : !chart?.points?.length ? (
                      <ChartEmpty />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chart.points}>
                          <defs>
                            <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="t"
                            tickFormatter={(t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                            stroke="var(--muted-foreground)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} tickLine={false} axisLine={false} width={56} />
                          <Tooltip
                            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                            labelFormatter={(t) => new Date(t).toLocaleDateString("vi-VN")}
                            formatter={(v: number) => [fmtNum(v, 2), SYM]}
                          />
                          <Area type="monotone" dataKey="v" stroke="var(--gold)" strokeWidth={2} fill="url(#stockGrad)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {stats && (
                    <div className="border-t border-border grid grid-cols-3 divide-x divide-border">
                      <MiniStat label={`Cao nhất ${days}N`} value={fmtNum(stats.max, 2)} />
                      <MiniStat label={`Thấp nhất ${days}N`} value={fmtNum(stats.min, 2)} />
                      <MiniStat
                        label={`Biến động ${days}N`}
                        value={`${stats.changePct >= 0 ? "+" : ""}${stats.changePct.toFixed(2)}%`}
                        tone={stats.changePct >= 0 ? "up" : "down"}
                      />
                    </div>
                  )}
                </Panel>

                <Panel className="rise d4">
                  <SectionLabel title={`Về cổ phiếu ${SYM}`} />
                  <div className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      <strong className="text-foreground">{SYM}</strong>
                      {data.companyName ? ` (${data.companyName})` : ""} là cổ phiếu niêm yết trên sàn{" "}
                      <strong className="text-foreground">{data.exchange ?? "HOSE/HNX/UPCOM"}</strong>
                      {data.industry ? `, thuộc ngành ${data.industry}` : ""}. Trang này cập nhật{" "}
                      <strong className="text-foreground">giá {SYM} realtime</strong>, các chỉ số định giá quan trọng (
                      <strong className="text-foreground">P/E</strong>, <strong className="text-foreground">EPS</strong>,{" "}
                      <strong className="text-foreground">P/B</strong>, <strong className="text-foreground">ROE</strong>,{" "}
                      <strong className="text-foreground">ROA</strong>) và biểu đồ kỹ thuật {SYM} 7-365 phiên gần nhất.
                    </p>
                    <p>
                      Theo dõi đồng thời với <Link to="/chung-khoan" className="text-[var(--gold)] hover:underline">chỉ số VN-Index</Link>,{" "}
                      <Link to="/vi-mo-viet-nam" className="text-[var(--gold)] hover:underline">vĩ mô Việt Nam</Link> và{" "}
                      <Link to="/lich-kinh-te" className="text-[var(--gold)] hover:underline">lịch kinh tế</Link> để đánh giá bối cảnh đầu tư.
                    </p>
                    {data.website && (
                      <p className="text-xs">
                        Website công ty:{" "}
                        <a
                          href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--gold)] hover:underline inline-flex items-center gap-1"
                        >
                          {data.website} <ExternalLink className="h-3 w-3" />
                        </a>
                        {data.established && <> · Thành lập {data.established}</>}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {["Cổ phiếu", data.exchange ?? "HOSE", data.industry ?? "Niêm yết", "Realtime"].filter(Boolean).map((t) => (
                        <span key={t} className="text-xs font-semibold text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded-md">{t}</span>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 italic pt-1">
                      Nguồn dữ liệu: {data.source} + VNDirect dchart. Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
                    </p>
                  </div>
                </Panel>
              </div>

              {/* RIGHT sidebar */}
              <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
                <Panel className="rise d4">
                  <SectionLabel title="Chỉ số tài chính" />
                  <div className="px-5 py-2">
                    <StatRow k="P/E" v={data.pe !== null ? data.pe.toFixed(2) : "—"} />
                    <StatRow k="EPS (VND)" v={data.eps !== null ? fmtNum(data.eps, 0) : "—"} />
                    <StatRow k="P/B" v={data.pb !== null ? data.pb.toFixed(2) : "—"} />
                    <StatRow k="BVPS (VND)" v={data.bvps !== null ? fmtNum(data.bvps, 0) : "—"} />
                    <StatRow k="ROE" v={fmtPct(data.roe !== null ? data.roe * 100 : null)} />
                    <StatRow k="ROA" v={fmtPct(data.roa !== null ? data.roa * 100 : null)} />
                    <StatRow k="Vốn hoá" v={fmtMarketCap(data.marketCap)} />
                    <StatRow k="Nhân viên" v={fmtInt(data.employees)} />
                  </div>
                </Panel>

                <Panel className="rise d5">
                  <SectionLabel title="Thông tin doanh nghiệp" />
                  <div className="px-5 py-2">
                    <StatRow k="Mã" v={SYM} />
                    {data.shortName && <StatRow k="Tên viết tắt" v={data.shortName} />}
                    <StatRow k="Sàn" v={data.exchange ?? "—"} />
                    <StatRow k="Ngành" v={data.industry ?? "—"} />
                    {data.established && <StatRow k="Thành lập" v={String(data.established)} />}
                    <StatRow k="Nhân viên" v={fmtInt(data.employees)} />
                  </div>
                </Panel>
              </aside>
            </div>

            <section className="rise d5 mt-5">
              <h2 className="text-2xl font-bold tracking-tight">Về cổ phiếu {SYM}</h2>
              <p className="text-muted-foreground mt-2">
                <strong>{SYM}</strong>{data.companyName ? ` (${data.companyName})` : ""} là cổ phiếu niêm yết trên sàn{" "}
                <strong>{data.exchange ?? "HOSE/HNX/UPCOM"}</strong>
                {data.industry ? `, thuộc ngành ${data.industry}` : ""}. Trang này cập nhật <strong>giá {SYM} realtime</strong>, các chỉ số định giá quan trọng (<strong>P/E</strong>, <strong>EPS</strong>, <strong>P/B</strong>, <strong>ROE</strong>, <strong>ROA</strong>) và <strong>biểu đồ kỹ thuật {SYM}</strong> 7-365 phiên gần nhất.
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

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-sm font-bold tabular", tone === "up" ? "text-[var(--up)]" : tone === "down" ? "text-[var(--down)]" : "")}>
        {value}
      </div>
    </div>
  );
}
