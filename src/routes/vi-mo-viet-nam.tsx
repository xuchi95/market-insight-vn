import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SectionCard } from "@/components/site/SectionCard";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { DataDisclaimer } from "@/components/site/DataDisclaimer";
import { cn } from "@/lib/utils";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/vi-mo-viet-nam`;
const TITLE = "Kinh tế vĩ mô Việt Nam — GDP, CPI, lãi suất SBV, dự trữ ngoại hối";
const DESC = "Số liệu vĩ mô Việt Nam chuẩn chính thống: tăng trưởng GDP, lạm phát CPI (GSO/IMF), lãi suất điều hành SBV, tỷ giá trung tâm, xuất nhập khẩu và dự trữ ngoại hối qua các năm.";

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

interface SbvPayload {
  centralRate: { pair: string; value: number | null; date: string | null; source: string };
  policyRates: { code: string; name: string; value: number; unit: string; effectiveFrom: string }[];
  fetchedAt: number;
  source: string;
  notes: string;
}

async function fetchMacro(force = false): Promise<MacroPayload> {
  const url = force ? "/api/public/macro-vn?refresh=1" : "/api/public/macro-vn";
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchSbv(): Promise<SbvPayload> {
  const res = await fetch("/api/public/sbv", { headers: { accept: "application/json" } });
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
      { name: "keywords", content: "kinh tế vĩ mô việt nam, gdp việt nam, lạm phát cpi, lãi suất sbv, lãi suất điều hành, lãi suất tái cấp vốn, tỷ giá trung tâm, dự trữ ngoại hối, xuất nhập khẩu, gso, world bank, imf" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Kinh tế vĩ mô Việt Nam", item: URL },
          ],
        }),
      },
    ],
  }),
  component: MacroPage,
});

function MacroPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const force = refreshKey > 0;

  const { data, isLoading, isError, isFetching } = useQuery<MacroPayload, Error>({
    queryKey: ["macro-vn", refreshKey],
    queryFn: () => fetchMacro(force),
    staleTime: 6 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: 1,
  });

  const { data: sbv } = useQuery<SbvPayload, Error>({
    queryKey: ["sbv"],
    queryFn: fetchSbv,
    staleTime: 6 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: 1,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:py-10 space-y-8">
          <Breadcrumbs />
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Kinh tế vĩ mô Việt Nam</h1>
            <DataDisclaimer />
          </header>

          {sbv && (
            <SectionCard
              title="Chính sách tiền tệ — Ngân hàng Nhà nước (SBV)"
            >
              <div className="p-4 lg:p-5 space-y-4">
                {sbv.centralRate.value && (
                  <div className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Tỷ giá trung tâm USD/VND</div>
                      <div className="text-2xl font-bold tabular-nums text-[var(--gold)] mt-1">
                        {sbv.centralRate.value.toLocaleString("vi-VN")} VND
                      </div>
                    </div>
                    {sbv.centralRate.date && (
                      <div className="text-xs text-muted-foreground">Áp dụng từ {sbv.centralRate.date}</div>
                    )}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sbv.policyRates.map((r) => (
                    <div key={r.code} className="rounded-xl border border-border bg-card p-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{r.name}</div>
                      <div className="text-2xl font-bold tabular-nums mt-1">{r.value.toFixed(2)}{r.unit.startsWith("%") ? "%" : ""}</div>
                      <div className="text-[11px] text-muted-foreground/80 mt-1">Hiệu lực từ {r.effectiveFrom}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground/70 italic">{sbv.notes}</p>
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Tổng quan chỉ số vĩ mô"
          >
            <div className="p-4 lg:p-5 space-y-4">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  disabled={isFetching}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                  {isFetching ? "Đang làm mới…" : "Làm mới dữ liệu ngay"}
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải số liệu vĩ mô…
                </div>
              ) : isError || !data ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-muted-foreground">Không tải được số liệu vĩ mô.</p>
                  <button onClick={() => setRefreshKey((k) => k + 1)} className="text-xs text-primary hover:underline">Thử lại</button>
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