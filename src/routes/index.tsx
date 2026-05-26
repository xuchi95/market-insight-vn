import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { NewsSection } from "@/components/site/NewsSection";
import { Footer } from "@/components/site/Footer";
import { Ticker } from "@/components/site/Ticker";
import { BentoTiles } from "@/components/site/BentoTiles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketWatch — Giá vàng SJC, DOJI, Bitcoin, USD realtime" },
      { name: "description", content: "Cập nhật giá vàng SJC, DOJI, BTC, ETH, USDT, USD, CNY và tỷ giá ngoại tệ theo thời gian thực — dashboard tài chính chuyên nghiệp tiếng Việt." },
      { property: "og:title", content: "MarketWatch — Theo dõi giá vàng, crypto, ngoại tệ realtime" },
      { property: "og:description", content: "Dashboard tài chính realtime: giá vàng SJC, BTC, ETH, USDT, USD và nhiều tài sản khác." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
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
                <div className="inline-flex items-center gap-2 mb-5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--up)] opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
                  </span>
                  <span className="eyebrow">Dữ liệu thời gian thực</span>
                </div>
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

          {/* News — editorial */}
          <section className="py-8 md:py-12 border-t border-border">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-display text-2xl md:text-3xl">Tin thị trường</h2>
              <div className="hairline flex-1 mx-6 hidden md:block" />
              <div className="eyebrow opacity-60">Mới nhất</div>
            </div>
            <NewsSection />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
