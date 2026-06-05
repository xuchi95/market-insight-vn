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
            <div className="grid md:grid-cols-12 gap-6 md:gap-10 items-end">
              <div className="md:col-span-7">
                <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-5xl lg:text-6xl leading-[1.1] tracking-tight text-foreground text-balance">
                  Theo dõi giá <em className="text-[var(--gold)] not-italic font-display italic">vàng</em>,{" "}
                  <span className="text-[var(--gold)]">crypto</span> &amp; tỷ giá ngoại tệ.
                </h1>
              </div>
              <div className="md:col-span-5 md:pl-8 md:border-l md:border-border">
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed text-pretty">
                  Công cụ theo dõi dữ liệu tài chính của Việt Nam; Giá vàng, tiền số và ngoại tệ.... cập nhật theo từng phút.
                </p>
                <div className="mt-5 eyebrow opacity-60">Số {new Date().getDate()}.{String(new Date().getMonth() + 1).padStart(2, "0")} · Phiên thị trường</div>
              </div>
            </div>
          </section>

          {/* Bento */}
          <section className="py-10 md:py-14">
            <div className="flex items-baseline justify-between mb-5 md:mb-6">
              <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Bảng giá thị trường</h2>
            </div>
            <BentoTiles initial={initialPrices} />
          </section>

          {/* AI dự đoán giá — CTA */}
          <section className="pb-10 md:pb-14">
            <Link
              to="/du-doan-gia-ai"
              className="group block rounded-2xl border border-[var(--gold)]/40 bg-[color-mix(in_oklab,var(--gold)_8%,var(--background))] p-6 md:p-8 transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_14%,var(--background))]"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                <div className="flex-1">
                  <div className="eyebrow text-[var(--gold)] mb-2">✨ Mới · Trí tuệ nhân tạo</div>
                  <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">
                    AI dự đoán giá vàng, xăng dầu, Bitcoin &amp; ngoại tệ
                  </h2>
                  <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
                    Chọn tài sản và khung thời gian (24h / 7 ngày / 30 ngày). AI phân tích dữ liệu
                    thị trường thời gian thực để đưa ra xu hướng, biên độ % và 3 kịch bản tham
                    khảo — hoàn toàn miễn phí.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] text-background px-5 py-2.5 text-sm font-semibold group-hover:opacity-90 transition-opacity">
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
