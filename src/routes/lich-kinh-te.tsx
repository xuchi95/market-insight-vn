import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ECONOMIC_EVENTS, flagEmoji, type EconImpact, type EconomicEvent } from "@/lib/data/economicCalendar";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/lich-kinh-te`;
const TITLE = "Lịch kinh tế — Sự kiện Fed, CPI, NFP ảnh hưởng vàng & USD";
const DESC = "Lịch kinh tế quốc tế: cuộc họp FOMC, CPI Mỹ, NFP, ECB, BoJ và các sự kiện tác động đến giá vàng, USD/VND, Bitcoin, chứng khoán — cập nhật theo giờ Việt Nam.";

export const Route = createFileRoute("/lich-kinh-te")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "lịch kinh tế, lịch fed, cuộc họp fomc, cpi mỹ, nfp, lãi suất ecb, sự kiện kinh tế ảnh hưởng vàng" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: EconomicCalendarPage,
});

const IMPACTS: { value: "all" | EconImpact; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "high", label: "Cao" },
  { value: "medium", label: "Trung bình" },
  { value: "low", label: "Thấp" },
];

const RANGES = [
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "all", label: "Tất cả" },
] as const;
type RangeValue = (typeof RANGES)[number]["value"];

function impactBadge(impact: EconImpact) {
  const cls =
    impact === "high"
      ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
      : impact === "medium"
      ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
      : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  const label = impact === "high" ? "Cao" : impact === "medium" ? "Trung bình" : "Thấp";
  return <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${cls}`}>{label}</Badge>;
}

const AFFECTS_LABEL: Record<string, string> = {
  gold: "Vàng",
  usd: "USD",
  btc: "BTC",
  stocks: "Chứng khoán",
  vnd: "VND",
};

const SOURCE_LABEL: Record<string, string> = {
  fmp: "FMP",
  forexfactory: "ForexFactory",
  reference: "lịch tham khảo",
};

function fmtVN(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function EconomicCalendarPage() {
  const [impact, setImpact] = useState<"all" | EconImpact>("all");
  const [range, setRange] = useState<RangeValue>("month");

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["economic-calendar"],
    queryFn: async () => {
      const res = await fetch("/api/public/economic-calendar", { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (!Array.isArray(j?.items)) throw new Error("Invalid response");
      return { items: j.items as EconomicEvent[], stale: Boolean(j.stale), fetchedAt: Number(j.fetchedAt) || Date.now(), source: String(j.source ?? "") };
    },
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const usingFallback = isError || (!isLoading && (data?.items.length ?? 0) === 0);
  const source: EconomicEvent[] = usingFallback ? ECONOMIC_EVENTS : (data?.items ?? []);

  const events = useMemo(() => {
    const now = Date.now();
    let cutoffStart = -Infinity;
    let cutoffEnd = Infinity;
    if (range === "week") {
      cutoffStart = now - 2 * 86400_000;
      cutoffEnd = now + 7 * 86400_000;
    } else if (range === "month") {
      cutoffStart = now - 7 * 86400_000;
      cutoffEnd = now + 31 * 86400_000;
    }
    return source.filter((e) => {
      const t = new Date(e.datetime).getTime();
      if (t < cutoffStart || t > cutoffEnd) return false;
      if (impact !== "all" && e.impact !== impact) return false;
      return true;
    }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [impact, range, source]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Breadcrumbs />
          <header className="mt-4 mb-8">
            <h1 className="font-display text-3xl md:text-5xl">Lịch kinh tế</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Các sự kiện kinh tế quan trọng từ Fed, ECB, BoJ, BLS… ảnh hưởng trực tiếp đến vàng, USD/VND, Bitcoin và chứng khoán. Giờ hiển thị theo múi giờ Việt Nam (UTC+7).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {isLoading && (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải dữ liệu realtime…
                </span>
              )}
              {!isLoading && !usingFallback && data && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {data.source === "reference" ? "Dữ liệu dự phòng" : "Dữ liệu realtime"} · nguồn {SOURCE_LABEL[data.source] ?? data.source ?? "API"}
                  </span>
                  <span>· Cập nhật {new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(data.fetchedAt))}</span>
                  {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {data.stale && <span className="text-amber-500">(cache cũ)</span>}
                </>
              )}
              {!isLoading && usingFallback && (
                <span className="inline-flex items-center gap-1.5 text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Không tải được dữ liệu realtime — đang hiển thị lịch tham khảo.
                </span>
              )}
            </div>
          </header>

          <div className="flex flex-wrap gap-2 mb-5">
            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              {RANGES.map((r) => (
                <Button
                  key={r.value}
                  size="sm"
                  variant={range === r.value ? "default" : "ghost"}
                  className="h-7 px-3 text-xs rounded-full"
                  onClick={() => setRange(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              {IMPACTS.map((i) => (
                <Button
                  key={i.value}
                  size="sm"
                  variant={impact === i.value ? "default" : "ghost"}
                  className="h-7 px-3 text-xs rounded-full"
                  onClick={() => setImpact(i.value)}
                >
                  {i.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-card text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
              <div className="col-span-3">Thời gian (VN)</div>
              <div className="col-span-2">Quốc gia</div>
              <div className="col-span-3">Sự kiện</div>
              <div className="col-span-1 text-center">Mức ảnh hưởng</div>
              <div className="col-span-1 text-right">Trước</div>
              <div className="col-span-1 text-right">Dự báo</div>
              <div className="col-span-1 text-right">Tài sản</div>
            </div>
            {events.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Không có sự kiện phù hợp với bộ lọc.
              </div>
            )}
            {events.map((e: EconomicEvent) => {
              const t = new Date(e.datetime).getTime();
              const soon = t > Date.now() && t - Date.now() < 24 * 3600_000;
              return (
                <div
                  key={e.id}
                  className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors ${
                    soon ? "bg-[var(--gold)]/5" : ""
                  }`}
                >
                  <div className="md:col-span-3 text-sm">
                    {fmtVN(new Date(e.datetime))}
                    {soon && (
                      <Badge className="ml-2 bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/30 text-[9px]" variant="outline">
                        SẮP DIỄN RA
                      </Badge>
                    )}
                  </div>
                  <div className="md:col-span-2 text-sm flex items-center gap-2">
                    <span className="text-lg leading-none">{flagEmoji(e.country)}</span>
                    <span>{e.countryName}</span>
                  </div>
                  <div className="md:col-span-3 text-sm font-medium">{e.event}</div>
                  <div className="md:col-span-1 md:text-center">{impactBadge(e.impact)}</div>
                  <div className="md:col-span-1 text-sm text-right text-muted-foreground tabular-nums">{e.previous ?? "—"}</div>
                  <div className="md:col-span-1 text-sm text-right tabular-nums">{e.forecast ?? "—"}</div>
                  <div className="md:col-span-1 flex flex-wrap md:justify-end gap-1">
                    {e.affects.map((a) => (
                      <Badge key={a} variant="outline" className="text-[9px] uppercase tracking-wider">
                        {AFFECTS_LABEL[a] ?? a}
                      </Badge>
                    ))}
                  </div>
                  {e.note && (
                    <div className="md:col-span-12 -mt-1 text-xs text-muted-foreground italic">
                      {e.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Dữ liệu được biên soạn từ các nguồn công khai (Fed, ECB, BLS, Tổng cục Thống kê…) chỉ mang tính tham khảo. MarketWatch không chịu trách nhiệm về quyết định đầu tư dựa trên dữ liệu này.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}