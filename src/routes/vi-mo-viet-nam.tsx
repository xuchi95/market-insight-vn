import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SectionCard } from "@/components/site/SectionCard";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { cn } from "@/lib/utils";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/vi-mo-viet-nam`;
const TITLE = "Kinh tế vĩ mô Việt Nam — GDP, lạm phát, thất nghiệp, dự trữ ngoại hối";
const DESC = "Số liệu vĩ mô Việt Nam cập nhật từ IMF WEO và World Bank: tăng trưởng GDP, lạm phát CPI, thất nghiệp, lãi suất, xuất nhập khẩu, dự trữ ngoại hối qua các năm.";

interface MacroPoint { year: number; value: number }
interface MacroIndicator {
  code: string;
  name: string;
  unit: string;
  latest?: MacroPoint;
  previous?: MacroPoint;
  history: MacroPoint[];
}
interface MacroPayload {
  country: string;
  indicators: MacroIndicator[];
  fetchedAt: number;
  source: string;
}

async function fetchMacro(): Promise<MacroPayload> {
  const res = await fetch("/api/public/macro-vn", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function fmtCompactUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)} nghìn tỷ USD`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} tỷ USD`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)} triệu USD`;
  return n.toLocaleString("en-US");
}

function formatValue(v: number, unit: string): string {
  if (unit === "USD") return fmtCompactUsd(v);
  if (unit.includes("%")) return `${v.toFixed(2)}%`;
  return v.toLocaleString("vi-VN");
}

function IndicatorCard({ ind }: { ind: MacroIndicator }) {
  if (!ind.latest) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{ind.name}</div>
        <div className="mt-2 text-sm text-muted-foreground">Chưa có dữ liệu.</div>
      </div>
    );
  }
  const diff = ind.previous ? ind.latest.value - ind.previous.value : 0;
  const diffPct = ind.previous && ind.previous.value !== 0
    ? (diff / Math.abs(ind.previous.value)) * 100
    : 0;
  const up = diff >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const chartData = ind.history.slice(-10);
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm uppercase tracking-[0.14em] text-muted-foreground">{ind.name}</div>
          <div className="text-xs text-muted-foreground/70 mt-0.5">Năm {ind.latest.year} · {ind.unit}</div>
        </div>
        {ind.previous && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", up ? "bg-[var(--up)]/10 text-[var(--up)]" : "bg-[var(--down)]/10 text-[var(--down)]")}>
            <Icon className="h-3 w-3" />
            {ind.unit === "USD"
              ? `${up ? "+" : ""}${diffPct.toFixed(1)}%`
              : `${up ? "+" : ""}${diff.toFixed(2)}`}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums">{formatValue(ind.latest.value, ind.unit)}</div>
      {chartData.length > 1 && (
        <div className="h-16 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`g-${ind.code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [formatValue(v, ind.unit), ind.name]}
                labelFormatter={(l) => `Năm ${l}`}
              />
              <Area type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={1.5} fill={`url(#g-${ind.code})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/vi-mo-viet-nam")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "kinh tế vĩ mô việt nam, gdp việt nam, lạm phát cpi, thất nghiệp, dự trữ ngoại hối, xuất nhập khẩu, world bank" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
        }),
      },
    ],
  }),
  component: MacroPage,
});

function MacroPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["macro-vn"],
    queryFn: fetchMacro,
    staleTime: 6 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: 1,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <Breadcrumbs />
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Kinh tế vĩ mô Việt Nam</h1>
            <p className="text-muted-foreground max-w-2xl">
              Các chỉ số kinh tế quan trọng của Việt Nam: <strong>tăng trưởng GDP</strong>, lạm phát CPI, thất nghiệp, lãi suất cho vay, dự trữ ngoại hối, xuất nhập khẩu — số liệu cập nhật từ <strong>IMF WEO</strong> và <strong>World Bank Open Data</strong>.
            </p>
          </header>

          <SectionCard
            title="Tổng quan chỉ số vĩ mô"
            description="Số liệu mới nhất + xu hướng 10 năm gần đây"
            meta={data && <span>Nguồn: {data.source}</span>}
          >
            <div className="p-4 lg:p-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải số liệu vĩ mô…
                </div>
              ) : isError || !data ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-muted-foreground">Không tải được số liệu vĩ mô.</p>
                  <button onClick={() => refetch()} className="text-xs text-primary hover:underline">Thử lại</button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.indicators.map((i) => <IndicatorCard key={i.code} ind={i} />)}
                </div>
              )}
            </div>
          </SectionCard>

          <section aria-labelledby="macro-info" className="prose prose-invert max-w-none space-y-4">
            <h2 id="macro-info" className="text-2xl font-bold tracking-tight">Đọc dữ liệu vĩ mô như thế nào?</h2>
            <p className="text-muted-foreground">
              <strong>Tăng trưởng GDP</strong> phản ánh quy mô mở rộng của nền kinh tế. <strong>Lạm phát CPI</strong> đo mức tăng giá hàng tiêu dùng — khi CPI cao, sức mua tiền đồng giảm, đẩy nhu cầu trú ẩn vào <Link to="/gia-vang" className="text-primary hover:underline">vàng SJC</Link> tăng lên. <strong>Lãi suất cho vay</strong> ảnh hưởng trực tiếp tới <Link to="/ty-gia-ngan-hang" className="text-primary hover:underline">tỷ giá ngân hàng</Link> và dòng tiền vào <Link to="/chung-khoan" className="text-primary hover:underline">chứng khoán</Link>.
            </p>
            <p className="text-muted-foreground">
              <strong>Dự trữ ngoại hối</strong> cao giúp ổn định <Link to="/ty-gia-ngoai-te" className="text-primary hover:underline">tỷ giá USD/VND</Link>; <strong>cán cân xuất nhập khẩu</strong> dương (xuất &gt; nhập) là yếu tố tích cực cho VND. Theo dõi đồng thời các chỉ số này với <Link to="/lich-kinh-te" className="text-primary hover:underline">lịch kinh tế thế giới</Link> giúp đánh giá bối cảnh đầu tư.
            </p>
          </section>

          <RelatedLinks current="economy" />
        </div>
      </main>
      <Footer />
    </div>
  );
}