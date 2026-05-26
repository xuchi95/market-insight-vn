import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bitcoin, Coins, DollarSign } from "lucide-react";
import { Header } from "@/components/site/Header";
import { NewsSection } from "@/components/site/NewsSection";
import { Footer } from "@/components/site/Footer";

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
      <main className="flex-1">
        {/* Hero đơn giản, không hiển thị giá */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <div className="container relative mx-auto px-4 py-12 lg:py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--up)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--up)]" />
                </span>
                Đang cập nhật realtime
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
                Theo dõi giá <span className="text-gold">vàng</span>, <span className="text-gold">crypto</span> và <span className="text-gold">tỷ giá ngoại tệ</span> realtime
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                Cập nhật liên tục giá SJC, DOJI, BTC, ETH, USDT, USD, CNY và nhiều tài sản khác — dashboard tài chính chuyên nghiệp ngay trên trình duyệt.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CategoryCard
              to="/gold"
              icon={<Coins className="h-5 w-5" />}
              title="Giá vàng"
              desc="SJC, DOJI, PNJ, BTMC, Phú Quý và vàng thế giới XAU/USD."
            />
            <CategoryCard
              to="/crypto"
              icon={<Bitcoin className="h-5 w-5" />}
              title="Tiền mã hoá"
              desc="BTC, ETH, USDT, BNB, SOL, XRP, DOGE, TON…"
            />
            <CategoryCard
              to="/forex"
              icon={<DollarSign className="h-5 w-5" />}
              title="Ngoại tệ"
              desc="USD, EUR, JPY, CNY, GBP, KRW, AUD… quy đổi VND."
            />
          </section>
          <NewsSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function CategoryCard({ to, icon, title, desc }: { to: "/gold" | "/crypto" | "/forex"; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-gold/60 hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold-gradient text-gold-foreground">
          {icon}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold">
        Xem chi tiết
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
