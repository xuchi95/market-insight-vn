import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Ticker } from "@/components/site/Ticker";
import { BentoTiles } from "@/components/site/BentoTiles";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { WatchlistPanel } from "@/components/site/WatchlistPanel";
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
          {/* Hero — editorial masthead */}
          <section className="py-10 md:py-14 border-b border-border">
            <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-end">
              <div className="md:col-span-7">
                <h1 className="font-display font-bold text-[2.6rem] sm:text-[3.2rem] md:text-[3.75rem] lg:text-[4.4rem] leading-[1.02] tracking-[-0.018em] text-foreground text-balance">
                  Theo dõi giá
                  <br />
                  <em className="not-italic text-[var(--gold)]">vàng, crypto</em> &amp;
                  <br />
                  tỷ giá ngoại tệ.
                </h1>
              </div>
              <div className="md:col-span-5 md:pb-2">
                <p className="text-[15px] text-muted-foreground leading-relaxed text-pretty max-w-[42ch]">
                  Công cụ trực quan hoá dữ liệu tài chính Việt Nam — giá vàng, tiền số, ngoại tệ và lãi suất, cập nhật theo từng phút.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  <span aria-hidden className="inline-block w-[22px] h-px bg-[color-mix(in_oklab,var(--gold)_70%,transparent)]" />
                  Số {new Date().getDate()}.{String(new Date().getMonth() + 1).padStart(2, "0")} · Phiên thị trường
                </div>
              </div>
            </div>
          </section>

          {/* Bento */}
          <section className="py-10 md:py-14">
            <div className="flex items-baseline justify-between mb-5 md:mb-6 gap-4">
              <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Bảng giá thị trường</h2>
              <div className="hidden sm:inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gold)] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                </span>
                Cập nhật {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · Realtime
              </div>
            </div>
            <BentoTiles initial={initialPrices} />
          </section>

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
                    ✦ Mới · Trí tuệ nhân tạo
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight text-foreground">
                    AI dự đoán giá vàng, xăng dầu, Bitcoin &amp; ngoại tệ
                  </h2>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] text-[var(--gold-foreground)] px-5 py-2.5 text-sm font-semibold shadow-[0_1px_0_rgba(255,255,255,.18)_inset] transition-colors group-hover:bg-[var(--gold-light)]">
                    Thử ngay →
                  </span>
                </div>
              </div>
            </Link>
          </section>

          {user && (
            <section className="py-10 md:py-14 border-t border-border">
              <div className="flex items-baseline justify-between mb-5 md:mb-6">
                <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Theo dõi của bạn</h2>
                <div className="eyebrow opacity-60 hidden sm:block">Đồng bộ giữa các thiết bị</div>
              </div>
              <WatchlistPanel />
            </section>
          )}

          <section className="py-10 md:py-14 border-t border-border">
            <RelatedLinks current="home" title="Khám phá theo chủ đề" />
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
