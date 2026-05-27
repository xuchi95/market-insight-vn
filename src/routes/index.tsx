import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Ticker } from "@/components/site/Ticker";
import { BentoTiles } from "@/components/site/BentoTiles";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/`;
const TITLE = "MarketWatch — Giá vàng SJC, Bitcoin, USD/VND realtime hôm nay";
const DESC = "Giá vàng SJC, DOJI, PNJ, Bitcoin (BTC), Ethereum (ETH), USDT, tỷ giá USD/VND, EUR, JPY, CNY cập nhật realtime — dashboard tài chính tiếng Việt cho nhà đầu tư.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "giá vàng hôm nay, giá vàng sjc, giá bitcoin hôm nay, giá btc, giá eth, tỷ giá usd, tỷ giá usd vietcombank, tỷ giá ngoại tệ, vn-index, dashboard tài chính" },
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
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Ticker />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5">
          {/* Hero — editorial masthead */}
          <section className="py-10 md:py-14 border-b border-border">
            <div className="grid md:grid-cols-12 gap-8 items-end">
              <div className="md:col-span-8">
                <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.02] text-foreground">
                  Theo dõi giá <em className="text-[var(--gold)] not-italic font-display italic">vàng</em>,{" "}
                  <span className="text-[var(--gold)]">crypto</span> &amp; tỷ giá ngoại tệ.
                </h1>
              </div>
              <div className="md:col-span-4 md:pl-6 md:border-l md:border-border">
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Một bản tin số liệu súc tích cho nhà đầu tư Việt — SJC, DOJI, BTC, ETH, USD/VND và hơn thế, cập nhật tức thì từ các sàn lớn.
                </p>
                <div className="mt-4 eyebrow opacity-60">Số {new Date().getDate()}.{String(new Date().getMonth() + 1).padStart(2, "0")} · Phiên thị trường</div>
              </div>
            </div>
          </section>

          {/* Bento */}
          <section className="py-8 md:py-10">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-display text-2xl md:text-3xl">Bảng giá thị trường</h2>
              <div className="eyebrow opacity-60 hidden sm:block">Cập nhật mỗi 30 giây</div>
            </div>
            <BentoTiles />
          </section>

          <section className="py-8 md:py-10">
            <RelatedLinks current="home" title="Khám phá theo chủ đề" />
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
