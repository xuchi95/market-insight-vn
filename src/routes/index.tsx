import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Ticker } from "@/components/site/Ticker";
import { BentoTiles } from "@/components/site/BentoTiles";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { WatchlistPanel } from "@/components/site/WatchlistPanel";
import { AdSlot } from "@/components/site/AdSlot";
import { MarketSummaryCard } from "@/components/site/MarketSummaryCard";
import { ArrowRight, Star, Radio, ShieldCheck, BarChart3, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getInitialPrices } from "@/lib/initial-prices.functions";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/`;
const TITLE = "Giá vàng SJC, Bitcoin, USD/VND hôm nay — MarketWatch";
const DESC = "Công cụ theo dõi dữ liệu tài chính Việt Nam: giá vàng SJC, DOJI, PNJ, Bitcoin (BTC), Ethereum (ETH), USDT, tỷ giá USD/VND, EUR, JPY, CNY cập nhật realtime theo từng phút.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "giá vàng hôm nay, giá vàng sjc, giá bitcoin hôm nay, giá btc, giá eth, tỷ giá usd, tỷ giá usd vietcombank, tỷ giá ngoại tệ, vn-index, công cụ theo dõi giá tài chính" },
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
          "@type": "WebPage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
          about: ["Giá vàng SJC", "Giá Bitcoin", "Tỷ giá USD/VND", "Crypto", "Ngoại tệ"],
        }),
      },
    ],
  }),
  loader: () => getInitialPrices(),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-sm text-muted-foreground">
      Không tải được dữ liệu giá: {error.message}
    </div>
  ),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const initialPrices = Route.useLoaderData();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Ticker />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5">
          {/* Hero — split: pitch + CTAs on left, MarketSummaryCard on right */}
          <section className="py-10 md:py-14 border-b border-border">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="lg:col-span-7 animate-fade-in">
                <h1 className="font-display font-bold text-[2rem] sm:text-[2.5rem] md:text-[2.85rem] lg:text-[3.1rem] leading-[1.06] tracking-[-0.018em] text-foreground text-balance">
                  Theo dõi giá{" "}
                  <em className="not-italic text-[var(--gold)]">vàng,</em>
                  <br />
                  <em className="not-italic text-[var(--gold)]">crypto</em> &amp; tỷ giá{" "}
                  <em className="not-italic text-[var(--gold)]">ngoại tệ</em>
                  <br />
                  theo thời gian thực
                </h1>
                <p className="mt-5 md:mt-6 text-base md:text-[17px] text-muted-foreground leading-relaxed max-w-[58ch]">
                  Cập nhật chính xác. Phân tích chuyên sâu. Công cụ thông minh.
                  <br />
                  Nền tảng đáng tin cậy cho mọi quyết định tài chính.
                </p>

                {/* CTAs */}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    to="/tien-dien-tu"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] text-[var(--gold-foreground)] px-5 py-3 text-sm font-semibold shadow-[0_1px_0_rgba(255,255,255,.2)_inset,0_12px_28px_-12px_color-mix(in_oklab,var(--gold)_55%,transparent)] transition-colors hover:bg-[var(--gold-light)]"
                  >
                    Khám phá thị trường <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={user ? "/" : "/auth"}
                    hash={user ? "theo-doi" : undefined}
                    className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--gold)_28%,var(--border))] bg-card/60 text-foreground px-5 py-3 text-sm font-semibold transition-colors hover:border-[var(--gold)]/70 hover:bg-accent/40"
                  >
                    Xem danh sách theo dõi <Star className="h-4 w-4 text-[var(--gold)]" />
                  </Link>
                </div>

                {/* Trust badges */}
                <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] md:text-[12.5px] text-muted-foreground">
                  <li className="inline-flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-[var(--gold)]" /> Dữ liệu thời gian thực
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--gold)]" /> Nguồn đáng tin cậy
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-[var(--gold)]" /> Phân tích chuyên sâu
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" /> Công cụ thông minh
                  </li>
                </ul>
              </div>

              <div
                className="lg:col-span-5 animate-fade-in"
                style={{ animationDelay: "120ms", animationFillMode: "both" }}
              >
                <MarketSummaryCard />
              </div>
            </div>
          </section>

          {/* Bento */}
          <section className="py-10 md:py-14">
            <div className="flex items-baseline justify-between mb-5 md:mb-6 gap-4">
              <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Bảng giá thị trường</h2>
              <Link to="/tien-dien-tu" className="hidden sm:inline-flex items-center gap-1 text-sm text-[var(--gold)] hover:text-[var(--gold-light)] font-medium">
                Xem tất cả →
              </Link>
            </div>
            <BentoTiles initial={initialPrices} />
          </section>

          {/* In-article ad — sau bảng giá thị trường */}
          <AdSlot
            placement="in-article"
            format="auto"
            slot={import.meta.env.VITE_ADSENSE_SLOT_HOME_INARTICLE as string | undefined}
            className="mb-10 md:mb-14"
          />

          {/* AI dự đoán giá — CTA */}
          <section className="pb-10 md:pb-14">
            <Link
              to="/du-doan-gia-ai"
              className="group relative block overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-card p-6 md:p-8 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.5)] transition-colors hover:border-[var(--gold)]/60"
              style={{
                backgroundImage:
                  "radial-gradient(420px 180px at 88% 50%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%)",
              }}
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[var(--gold-light)] to-[var(--gold)]"
              />
              <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                <div className="flex-1">
                  <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                    <span aria-hidden className="inline-block animate-sparkle-pulse">✦</span>
                    Mới · Trí tuệ nhân tạo
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight text-foreground">
                    AI dự đoán giá vàng, xăng dầu, Bitcoin &amp; ngoại tệ
                  </h2>
                </div>
                <div className="shrink-0 w-full md:w-auto">
                  <span className="inline-flex w-full md:w-auto justify-center items-center gap-2 rounded-lg bg-[var(--gold)] text-[var(--gold-foreground)] px-5 py-3 md:py-2.5 text-sm font-semibold shadow-[0_1px_0_rgba(255,255,255,.18)_inset] transition-colors group-hover:bg-[var(--gold-light)]">
                    Thử ngay →
                  </span>
                </div>
              </div>
            </Link>
          </section>

          {user && (
            <section id="theo-doi" className="py-10 md:py-14 border-t border-border scroll-mt-24">
              <div className="flex items-baseline justify-between mb-5 md:mb-6">
                <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Theo dõi của bạn</h2>
                <div className="eyebrow opacity-60 hidden sm:block">Đồng bộ giữa các thiết bị</div>
              </div>
              <WatchlistPanel compact />
            </section>
          )}

          <section className="py-10 md:py-14 border-t border-border">
            <RelatedLinks
              current="home"
              title="Khám phá theo chủ đề"
              gridClassName="grid gap-3 md:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            />
          </section>

          {/* Trust strip — internal links to About + Data Sources for SEO discovery */}
          <section aria-labelledby="trust-strip" className="py-10 md:py-14 border-t border-border">
            <h2 id="trust-strip" className="font-display text-2xl md:text-3xl leading-tight tracking-tight mb-5 md:mb-6">
              Minh bạch & nguồn dữ liệu
            </h2>
            <div className="grid gap-4 md:gap-5 sm:grid-cols-2">
              <Link
                to="/ve-chung-toi"
                className="group rounded-xl border border-border/60 bg-card/60 p-5 md:p-6 transition-all hover:border-[var(--gold)]/70 hover:bg-accent/40 hover:-translate-y-0.5"
              >
                <div className="eyebrow opacity-80 mb-2">Về chúng tôi</div>
                <div className="font-display text-lg md:text-xl leading-snug text-foreground mb-1.5">
                  Về MarketWatch Việt Nam — đội ngũ &amp; sứ mệnh
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Công ty TNHH MTV Xuân Diệu Media vận hành, đặt tại Đà Nẵng. Sứ mệnh, người chịu trách nhiệm nội dung và định danh thương hiệu.
                </p>
              </Link>
              <Link
                to="/nguon-du-lieu"
                className="group rounded-xl border border-border/60 bg-card/60 p-5 md:p-6 transition-all hover:border-[var(--gold)]/70 hover:bg-accent/40 hover:-translate-y-0.5"
              >
                <div className="eyebrow opacity-80 mb-2">Phương pháp</div>
                <div className="font-display text-lg md:text-xl leading-snug text-foreground mb-1.5">
                  Nguồn dữ liệu &amp; phương pháp tính giá vàng, crypto, ngoại tệ
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Liệt kê chi tiết nguồn API, tần suất cập nhật, múi giờ và công thức quy đổi VND cho từng nhóm dữ liệu.
                </p>
              </Link>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
