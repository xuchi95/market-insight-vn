import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Info,
  Gem,
  Flame,
  Bitcoin,
  Banknote,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  predictAssetPrice,
  PREDICTABLE_ASSETS,
  HORIZONS,
  type AssetSlug,
  type PredictionResult,
} from "@/lib/ai-predict.functions";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/du-doan-gia-ai`;
const TITLE = "Dự đoán giá vàng SJC, Bitcoin, xăng dầu bằng AI | MarketWatch";
const DESC =
  "AI dự đoán giá vàng SJC, vàng nhẫn 9999, Bitcoin (BTC), Ethereum, xăng RON 95, dầu Brent/WTI và USD/VND cho 24h, 7 ngày, 30 ngày tới. Miễn phí, dữ liệu thời gian thực.";

export const Route = createFileRoute("/du-doan-gia-ai")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "ai dự đoán giá vàng, ai dự đoán giá xăng, ai dự báo bitcoin, dự đoán giá vàng sjc, dự đoán giá dầu, dự báo usd vnd, ai predict crypto, dự đoán thị trường tài chính",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "AI dự đoán giá", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AI Dự Đoán Giá — MarketWatch",
          url: URL,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "vi-VN",
          description: DESC,
          offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
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
              name: "Dự đoán giá vàng SJC hôm nay bằng AI có chính xác không?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "AI dự đoán giá vàng SJC dựa trên dữ liệu mua–bán hiện hành, giá vàng thế giới XAU/USD và bối cảnh vĩ mô. Đây là ước lượng xác suất, chỉ mang tính tham khảo, không phải lời khuyên đầu tư.",
              },
            },
            {
              "@type": "Question",
              name: "Có thể dự đoán giá Bitcoin (BTC) trong 24h, 7 ngày, 30 ngày tới không?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Có. Công cụ AI đoán giá BTC, ETH, SOL, BNB, XRP cho khung thời gian 24 giờ, 7 ngày hoặc 30 ngày tới, kèm 3 kịch bản lạc quan / cơ sở / bi quan và các động lực thúc đẩy giá.",
              },
            },
            {
              "@type": "Question",
              name: "AI dự đoán giá xăng dầu Việt Nam và dầu Brent/WTI thế nào?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "AI tham khảo bảng giá Petrolimex hiện hành (RON 95-III, E5 RON 92-II, Diesel 0,05S-II) cùng giá dầu Brent và WTI để dự đoán xu hướng giá xăng dầu cho kỳ điều hành sắp tới.",
              },
            },
            {
              "@type": "Question",
              name: "Tính năng AI dự đoán giá có miễn phí không?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Có, công cụ AI dự đoán giá vàng, Bitcoin, xăng dầu và ngoại tệ trên MarketWatch.vn hoàn toàn miễn phí, không yêu cầu đăng ký.",
              },
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Cách dùng AI dự đoán giá vàng, Bitcoin, xăng dầu",
          inLanguage: "vi-VN",
          step: [
            { "@type": "HowToStep", position: 1, name: "Chọn loại tài sản", text: "Chọn nhóm tài sản: vàng SJC, vàng nhẫn 9999, Bitcoin, Ethereum, xăng RON 95, dầu Brent/WTI hoặc USD/VND." },
            { "@type": "HowToStep", position: 2, name: "Chọn khung thời gian", text: "Chọn dự đoán cho 24 giờ, 7 ngày hoặc 30 ngày tới." },
            { "@type": "HowToStep", position: 3, name: "Nhận dự đoán AI", text: "Bấm 'Dự đoán bằng AI' để xem hướng giá, biên độ % thay đổi, động lực, rủi ro và 3 kịch bản tham khảo." },
          ],
        }),
      },
    ],
  }),
  component: AiPredictPage,
});

const CATEGORIES = Array.from(new Set(PREDICTABLE_ASSETS.map((a) => a.category)));

const CATEGORY_ICONS: Record<string, typeof Gem> = {
  "Kim loại quý": Gem,
  "Năng lượng": Flame,
  "Tiền điện tử": Bitcoin,
  "Ngoại tệ": Banknote,
};

function dirIcon(d: string, cls = "h-5 w-5") {
  if (d === "tăng") return <TrendingUp className={`${cls} text-emerald-500`} />;
  if (d === "giảm") return <TrendingDown className={`${cls} text-rose-500`} />;
  return <Minus className={`${cls} text-muted-foreground`} />;
}
function dirColor(d: string) {
  if (d === "tăng") return "text-emerald-500";
  if (d === "giảm") return "text-rose-500";
  return "text-muted-foreground";
}
function dirBg(d: string) {
  if (d === "tăng") return "bg-emerald-500/10 border-emerald-500/30";
  if (d === "giảm") return "bg-rose-500/10 border-rose-500/30";
  return "bg-muted/40 border-border";
}
function confidenceDots(c: string) {
  const n = c === "cao" ? 3 : c === "trung bình" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < n ? "bg-[var(--gold)]" : "bg-muted-foreground/25"
          }`}
        />
      ))}
    </span>
  );
}

function AiPredictPage() {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [asset, setAsset] = useState<AssetSlug>(
    PREDICTABLE_ASSETS.find((a) => a.category === CATEGORIES[0])!.slug,
  );
  const [horizon, setHorizon] = useState<"24h" | "7d" | "30d">("24h");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const { user, loading: authLoading } = useAuth();
  const isAuthed = !!user;

  const assetsInCategory = useMemo(
    () => PREDICTABLE_ASSETS.filter((a) => a.category === category),
    [category],
  );
  const activeMeta = PREDICTABLE_ASSETS.find((a) => a.slug === asset)!;

  const callPredict = useServerFn(predictAssetPrice);
  const mutation = useMutation({
    mutationFn: (vars: {
      asset: AssetSlug;
      horizon: "24h" | "7d" | "30d";
    }) =>
      callPredict({ data: vars }),
    onSuccess: (data) => setResult(data),
  });

  const onPredict = () => {
    if (!isAuthed) return;
    mutation.mutate({ asset, horizon });
  };

  const horizonLabel = HORIZONS.find((h) => h.value === horizon)!.label;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-5 pt-6 pb-16">
          <Breadcrumbs />

          {/* Editorial masthead */}
          <header className="mt-6 mb-10 border-b border-border pb-8">
            <div className="eyebrow text-[var(--gold)] mb-3 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Trí tuệ nhân tạo · Tham khảo</span>
            </div>
            <h1 className="font-display text-[2rem] sm:text-4xl md:text-5xl leading-[1.1] tracking-tight text-balance">
              AI dự đoán giá{" "}
              <em className="not-italic font-display italic text-[var(--gold)]">vàng</em>, xăng dầu,{" "}
              <span className="text-[var(--gold)]">Bitcoin</span> &amp; ngoại tệ
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed text-pretty">
              Chọn tài sản và khung thời gian, AI sẽ phân tích dữ liệu thị trường thời gian thực để
              đưa ra ước lượng xu hướng, biên độ % thay đổi và 3 kịch bản tham khảo. Kết quả{" "}
              <strong className="text-foreground">không phải lời khuyên đầu tư.</strong>
            </p>
          </header>

          {/* Step 1 — Category + asset */}
          <section className="mb-10">
            <StepHeader n={1} title="Chọn loại tài sản" hint="4 nhóm · 18 tài sản" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c] ?? Gem;
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      const first = PREDICTABLE_ASSETS.find((a) => a.category === c);
                      if (first) setAsset(first.slug);
                    }}
                    className={`group flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,var(--background))] shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_30%,transparent)]"
                        : "border-border hover:border-[var(--gold)]/40 hover:bg-card/50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-[var(--gold)]" : "text-muted-foreground"}`}
                    />
                    <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {assetsInCategory.map((a) => {
                const active = asset === a.slug;
                return (
                  <button
                    key={a.slug}
                    type="button"
                    onClick={() => setAsset(a.slug)}
                    className={`relative text-left rounded-xl border p-3.5 transition-all ${
                      active
                        ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_8%,var(--background))]"
                        : "border-border hover:border-[var(--gold)]/40 hover:bg-card/50"
                    }`}
                  >
                    {active && (
                      <CheckCircle2 className="absolute top-2 right-2 h-3.5 w-3.5 text-[var(--gold)]" />
                    )}
                    <div className="text-sm font-medium leading-tight pr-4">{a.label}</div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-1.5">{a.unit}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2 — Horizon */}
          <section className="mb-10">
            <StepHeader n={2} title="Khung thời gian dự báo" />
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {HORIZONS.map((h) => {
                const active = horizon === h.value;
                return (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => setHorizon(h.value)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 transition-all ${
                      active
                        ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,var(--background))]"
                        : "border-border hover:border-[var(--gold)]/40"
                    }`}
                  >
                    <Clock className={`h-4 w-4 ${active ? "text-[var(--gold)]" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {h.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sticky-feeling action bar */}
          <div className="mb-10 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="eyebrow opacity-60 mb-1">Sẵn sàng phân tích</div>
                <div className="text-base font-medium truncate">
                  {activeMeta.label}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {horizonLabel}
                  </span>
                </div>
              </div>
              {!isAuthed && !authLoading ? (
                <Link
                  to="/dang-nhap"
                  search={{ redirect: "/du-doan-gia-ai" } as never}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-6 py-3 text-sm font-semibold tracking-wide uppercase shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--gold)_60%,transparent)] hover:opacity-90 transition-opacity shrink-0"
                >
                  <Lock className="h-4 w-4" />
                  Đăng nhập để dùng AI
                </Link>
              ) : (
              <button
                type="button"
                onClick={onPredict}
                disabled={mutation.isPending || authLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-6 py-3 text-sm font-semibold tracking-wide uppercase shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--gold)_60%,transparent)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang phân tích…
                  </>
                ) : result ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Dự đoán lại
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Dự đoán bằng AI
                  </>
                )}
              </button>
              )}
            </div>
            {!isAuthed && !authLoading && (
              <p className="mt-3 text-xs text-muted-foreground">
                Tính năng AI yêu cầu tài khoản miễn phí để chống lạm dụng.{" "}
                <Link
                  to="/dang-ky"
                  search={{ redirect: "/du-doan-gia-ai" } as never}
                  className="text-[var(--gold)] underline-offset-2 hover:underline"
                >
                  Đăng ký nhanh
                </Link>{" "}
                hoặc{" "}
                <Link
                  to="/dang-nhap"
                  search={{ redirect: "/du-doan-gia-ai" } as never}
                  className="text-[var(--gold)] underline-offset-2 hover:underline"
                >
                  đăng nhập
                </Link>
                .
              </p>
            )}
          </div>

          {!isAuthed && !authLoading && (
            <Alert className="mb-6 border-[var(--gold)]/40 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]">
              <Lock className="h-4 w-4 text-[var(--gold)]" />
              <AlertDescription className="text-sm">
                <span className="font-semibold">Bạn cần đăng nhập để sử dụng Dự đoán giá AI.</span>{" "}
                Tính năng này yêu cầu tài khoản miễn phí nhằm chống lạm dụng và bảo vệ hạn mức AI.{" "}
                <Link
                  to="/dang-nhap"
                  search={{ redirect: "/du-doan-gia-ai" } as never}
                  className="text-[var(--gold)] font-medium underline-offset-2 hover:underline"
                >
                  Đăng nhập
                </Link>{" "}
                hoặc{" "}
                <Link
                  to="/dang-ky"
                  search={{ redirect: "/du-doan-gia-ai" } as never}
                  className="text-[var(--gold)] font-medium underline-offset-2 hover:underline"
                >
                  đăng ký nhanh
                </Link>{" "}
                để tiếp tục.
              </AlertDescription>
            </Alert>
          )}

          {mutation.isError && (() => {
            const rawMsg = (mutation.error as Error)?.message ?? "";
            const isAuthError =
              /unauthor|401|not authenticated|no authorization/i.test(rawMsg);
            if (isAuthError) {
              return (
                <Alert className="mb-6 border-[var(--gold)]/40 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]">
                  <Lock className="h-4 w-4 text-[var(--gold)]" />
                  <AlertDescription className="text-sm">
                    <span className="font-semibold">Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.</span>{" "}
                    Vui lòng{" "}
                    <Link
                      to="/dang-nhap"
                      search={{ redirect: "/du-doan-gia-ai" } as never}
                      className="text-[var(--gold)] font-medium underline-offset-2 hover:underline"
                    >
                      đăng nhập lại
                    </Link>{" "}
                    để tiếp tục sử dụng Dự đoán giá AI.
                  </AlertDescription>
                </Alert>
              );
            }
            return (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {rawMsg || "Đã có lỗi xảy ra, vui lòng thử lại."}
                </AlertDescription>
              </Alert>
            );
          })()}

          {mutation.isPending && (
            <div className="mb-10 rounded-2xl border border-border p-6 space-y-3">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {result && !mutation.isPending && (
            <ResultPanel result={result} />
          )}

          {/* Disclaimer */}
          <div className="mt-10 rounded-xl border border-[var(--gold)]/40 border-l-4 border-l-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_6%,var(--background))] p-4 text-sm leading-relaxed">
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-[var(--gold)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--gold)] uppercase tracking-wider text-xs">
                  Miễn trừ trách nhiệm
                </strong>
                <p className="mt-1 text-foreground/85">
                  Dự đoán do AI tạo ra dựa trên dữ liệu công khai và mô hình ngôn ngữ —{" "}
                  <strong>không phải</strong> tư vấn tài chính, không đảm bảo độ chính xác. Thị
                  trường có thể biến động bất thường; bạn tự chịu trách nhiệm với mọi quyết định
                  đầu tư.
                </p>
              </div>
            </div>
          </div>

          {/* Explainer */}
          <section className="mt-16">
            <div className="eyebrow text-[var(--gold)] mb-3">Cách hoạt động</div>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-4">
              AI dự đoán giá hoạt động thế nào?
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-3xl">
              Công cụ truy xuất dữ liệu giá{" "}
              <strong className="text-foreground">thời gian thực</strong> của vàng SJC, vàng nhẫn,
              xăng dầu Petrolimex, dầu Brent/WTI, Bitcoin, Ethereum và các cặp tỷ giá ngoại tệ —
              sau đó gửi tới mô hình AI để phân tích xu hướng ngắn hạn. Mô hình đưa ra: hướng giá
              kỳ vọng, biên độ % thay đổi, mức độ tự tin, các động lực chính và rủi ro có thể đảo
              chiều dự báo, kèm 3 kịch bản tham khảo (lạc quan / cơ sở / bi quan).
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {[
                { icon: Gem, title: "Kim loại quý", text: "Vàng SJC, vàng nhẫn 9999, XAU/USD, bạc, bạch kim." },
                { icon: Flame, title: "Năng lượng", text: "Brent, WTI, xăng RON 95-III, E5 RON 92, dầu Diesel." },
                { icon: Bitcoin, title: "Tiền điện tử", text: "Bitcoin, Ethereum, Solana, BNB, XRP." },
                { icon: Banknote, title: "Ngoại tệ", text: "USD/VND, EUR/VND, JPY/VND." },
              ].map((row) => (
                <div key={row.title} className="flex gap-3 rounded-xl border border-border p-4">
                  <row.icon className="h-5 w-5 text-[var(--gold)] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">{row.title}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{row.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-12">
            <div className="eyebrow text-[var(--gold)] mb-3">Câu hỏi thường gặp</div>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-6">FAQ</h2>
            <div className="divide-y divide-border border-y border-border">
              {[
                {
                  q: "AI dự đoán giá có chính xác 100% không?",
                  a: "Không. AI chỉ đưa ra ước lượng xác suất dựa trên dữ liệu thị trường và bối cảnh hiện tại — mọi dự đoán chỉ mang tính tham khảo, không phải lời khuyên đầu tư.",
                },
                {
                  q: "Công cụ có hỗ trợ vàng SJC & xăng dầu Việt Nam không?",
                  a: "Có. Hỗ trợ vàng SJC, vàng nhẫn 9999, xăng RON 95-III, E5 RON 92, dầu Diesel cùng các tài sản quốc tế như Bitcoin, Ethereum, Brent/WTI và USD/VND.",
                },
                {
                  q: "Khung thời gian dự đoán là bao lâu?",
                  a: "Bạn có thể chọn 24 giờ, 7 ngày hoặc 30 ngày tới.",
                },
                {
                  q: "Tính năng AI có miễn phí không?",
                  a: "Có, hoàn toàn miễn phí cho người dùng MarketWatch.vn.",
                },
              ].map((it) => (
                <details key={it.q} className="group py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                    <span className="font-medium text-base">{it.q}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Per-asset SEO content — long-tail keywords */}
          <section className="mt-16">
            <div className="eyebrow text-[var(--gold)] mb-3">Dự đoán theo tài sản</div>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-6">
              AI dự đoán giá từng loại tài sản
            </h2>
            <div className="grid md:grid-cols-2 gap-5">
              <article className="rounded-xl border border-border p-5">
                <h3 className="font-display text-lg mb-2">Dự đoán giá vàng SJC & vàng nhẫn 9999</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI dự đoán giá vàng SJC và vàng nhẫn 9999 dựa trên giá mua–bán hiện hành trong nước,
                  giá vàng thế giới <a href="/gia-vang" className="underline hover:text-[var(--gold)]">XAU/USD</a>,
                  tỷ giá USD/VND và bối cảnh vĩ mô (lãi suất Fed, lạm phát, dòng tiền trú ẩn).
                </p>
              </article>
              <article className="rounded-xl border border-border p-5">
                <h3 className="font-display text-lg mb-2">Dự đoán giá Bitcoin (BTC) & Ethereum</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Đoán giá BTC, ETH, SOL, BNB, XRP theo dữ liệu từ{" "}
                  <a href="/tien-dien-tu" className="underline hover:text-[var(--gold)]">thị trường crypto</a>{" "}
                  thời gian thực, chỉ số Fear &amp; Greed, vốn hóa và biến động 24h. Khung thời gian 24h / 7 ngày / 30 ngày.
                </p>
              </article>
              <article className="rounded-xl border border-border p-5">
                <h3 className="font-display text-lg mb-2">Dự đoán giá xăng dầu Việt Nam</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Dự báo xu hướng{" "}
                  <a href="/gia-xang-dau" className="underline hover:text-[var(--gold)]">giá xăng RON 95-III, E5 RON 92-II và dầu Diesel</a>{" "}
                  cho kỳ điều hành sắp tới, tham chiếu giá dầu Brent &amp; WTI cùng tỷ giá USD/VND.
                </p>
              </article>
              <article className="rounded-xl border border-border p-5">
                <h3 className="font-display text-lg mb-2">Dự đoán tỷ giá USD/VND, EUR/VND</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI ước lượng biến động{" "}
                  <a href="/ty-gia-ngoai-te" className="underline hover:text-[var(--gold)]">tỷ giá ngoại tệ USD/VND, EUR/VND, JPY/VND</a>{" "}
                  cho ngắn hạn, dựa trên chỉ số DXY, chính sách của SBV và dòng vốn FDI.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StepHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <div className="flex items-baseline gap-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--gold)]/40 text-[11px] font-mono text-[var(--gold)]">
          {n}
        </span>
        <h2 className="font-display text-xl md:text-2xl tracking-tight">{title}</h2>
      </div>
      {hint && <span className="eyebrow opacity-60 hidden sm:inline">{hint}</span>}
    </div>
  );
}

function ResultPanel({ result }: { result: PredictionResult }) {
  const meta = PREDICTABLE_ASSETS.find((a) => a.slug === result.asset)!;
  const horizonLabel = HORIZONS.find((h) => h.value === result.horizon)!.label;
  const low = result.expected_change_pct_low;
  const high = result.expected_change_pct_high;
  const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

  return (
    <article className="mb-6 rounded-2xl border border-border bg-card/40 overflow-hidden animate-fade-in">
      {/* Hero strip */}
      <div className={`relative border-b ${dirBg(result.direction)} px-6 py-6`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="min-w-0">
            <div className="eyebrow opacity-70 mb-1.5">Dự đoán · {horizonLabel}</div>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight truncate">
              {meta.label}
            </h2>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(result.generated_at).toLocaleString("vi-VN")}
            </div>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <div className="text-right">
              <div className="eyebrow opacity-60 mb-1">Biên độ kỳ vọng</div>
              <div className={`font-display text-2xl md:text-3xl tracking-tight ${dirColor(result.direction)}`}>
                {fmtPct(low)} → {fmtPct(high)}
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${dirBg(result.direction)}`}>
              {dirIcon(result.direction, "h-5 w-5")}
              <span className={`font-semibold uppercase tracking-wider text-sm ${dirColor(result.direction)}`}>
                {result.direction}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Độ tự tin:</span>
          {confidenceDots(result.confidence)}
          <span className="text-foreground font-medium capitalize">{result.confidence}</span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Summary */}
        <div>
          <div className="eyebrow text-[var(--gold)] mb-2">Tổng quan</div>
          <p className="text-base leading-relaxed text-foreground/90">{result.summary}</p>
        </div>

        {/* Drivers / Risks */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="eyebrow text-[var(--gold)] mb-3 inline-flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Động lực chính
            </div>
            <ul className="space-y-2.5 text-sm">
              {result.drivers.map((d, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-[var(--gold)] mt-0.5 font-mono text-xs">
                    0{i + 1}
                  </span>
                  <span className="leading-relaxed text-foreground/90">{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="eyebrow text-amber-500 mb-3 inline-flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              Rủi ro đảo chiều
            </div>
            <ul className="space-y-2.5 text-sm">
              {result.risks.map((r, i) => (
                <li key={i} className="flex gap-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className="leading-relaxed text-foreground/90">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Scenarios */}
        <div>
          <div className="eyebrow text-[var(--gold)] mb-3">3 kịch bản tham khảo</div>
          <div className="grid md:grid-cols-3 gap-3">
            <ScenarioCard tone="bull" label="Lạc quan" text={result.scenarios.bullish} />
            <ScenarioCard tone="base" label="Cơ sở" text={result.scenarios.base} />
            <ScenarioCard tone="bear" label="Bi quan" text={result.scenarios.bearish} />
          </div>
        </div>

        {result.context && (
          <details className="group border-t border-border pt-4">
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground">
              <span className="eyebrow opacity-70">Dữ liệu AI đã tham khảo</span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
              {result.context}
            </pre>
          </details>
        )}
      </div>
    </article>
  );
}

function ScenarioCard({
  tone,
  label,
  text,
}: {
  tone: "bull" | "base" | "bear";
  label: string;
  text: string;
}) {
  const styles =
    tone === "bull"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "bear"
        ? "border-rose-500/30 bg-rose-500/5"
        : "border-border bg-muted/20";
  const labelColor =
    tone === "bull"
      ? "text-emerald-500"
      : tone === "bear"
        ? "text-rose-500"
        : "text-muted-foreground";
  const Icon = tone === "bull" ? TrendingUp : tone === "bear" ? TrendingDown : Minus;
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className={`flex items-center gap-1.5 eyebrow ${labelColor} mb-2`}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}