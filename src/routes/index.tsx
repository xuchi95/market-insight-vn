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
              className="group relative block overflow-hidden rounded-2xl border border-[var(--gold)]/35 bg-card px-5 py-4 md:px-7 md:py-5 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.5)] transition-colors hover:border-[var(--gold)]/60"
            >
              {/* Decorative orbital "AI" graphic — right edge */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 hidden md:block w-[260px] overflow-hidden"
              >
                <span className="absolute inset-0" style={{ backgroundImage: "radial-gradient(220px 120px at 78% 50%, color-mix(in oklab, var(--gold) 22%, transparent), transparent 72%)" }} />
                <svg viewBox="0 0 260 96" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="aiOrbitStroke" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="color-mix(in oklab, var(--gold) 70%, transparent)" />
                      <stop offset="100%" stopColor="color-mix(in oklab, var(--gold) 0%, transparent)" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="190" cy="48" rx="78" ry="22" fill="none" stroke="url(#aiOrbitStroke)" strokeWidth="1" transform="rotate(-18 190 48)" />
                  <ellipse cx="190" cy="48" rx="62" ry="14" fill="none" stroke="url(#aiOrbitStroke)" strokeWidth="0.8" transform="rotate(-18 190 48)" opacity="0.7" />
                  <ellipse cx="190" cy="48" rx="92" ry="30" fill="none" stroke="url(#aiOrbitStroke)" strokeWidth="0.6" transform="rotate(-18 190 48)" opacity="0.45" />
                  {[[120,38],[260,60],[170,18],[230,76],[150,72]].map(([x,y],i)=>(
                    <circle key={i} cx={x} cy={y} r={i%2?0.9:1.4} fill="color-mix(in oklab, var(--gold) 85%, transparent)" opacity={0.6+(i%2)*0.3} />
                  ))}
                  <text x="190" y="56" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="26" fill="color-mix(in oklab, var(--gold) 85%, transparent)" fontWeight="600">AI</text>
                </svg>
              </span>

              <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div
                  aria-hidden
                  className="grid h-12 w-12 md:h-14 md:w-14 shrink-0 place-items-center rounded-2xl border border-[var(--gold)]/45 bg-gradient-to-br from-[var(--gold-light)]/25 to-[var(--gold)]/5 text-[var(--gold)] font-display italic text-xl md:text-2xl shadow-[inset_0_1px_0_color-mix(in_oklab,white_45%,transparent)]"
                >
                  AI
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-display text-lg md:text-xl leading-tight tracking-tight text-foreground">
                      Góc nhìn AI MarketWatch
                    </h2>
                    <span className="inline-flex items-center rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--gold)]">
                      Mới
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] md:text-sm text-muted-foreground leading-relaxed max-w-[60ch]">
                    AI phân tích xu hướng và đưa ra dự báo dựa trên dữ liệu lịch sử và biến động thị trường.
                  </p>
                </div>
                <div className="shrink-0 w-full md:w-auto md:mr-[200px]">
                  <span className="inline-flex w-full md:w-auto justify-center items-center gap-2 rounded-lg border border-border bg-background/60 text-foreground px-4 py-2.5 text-sm font-medium transition-colors group-hover:border-[var(--gold)]/60 group-hover:text-[var(--gold)]">
                    Xem dự báo hôm nay →
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
