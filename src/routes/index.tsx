import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Bitcoin, Coins, DollarSign } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { PriceChart } from "@/components/site/PriceChart";
import { ConverterTool } from "@/components/site/ConverterTool";
import { NewsSection } from "@/components/site/NewsSection";
import { Footer } from "@/components/site/Footer";
import { fetchGoldPrices } from "@/lib/services/goldPriceService";
import { fetchCryptoPrices } from "@/lib/services/cryptoPriceService";
import { fetchForexRates } from "@/lib/services/forexRateService";

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
  const [, setSearch] = useState("");

  const gold = useQuery({ queryKey: ["gold"], queryFn: fetchGoldPrices, refetchInterval: 5000 });
  const crypto = useQuery({ queryKey: ["crypto"], queryFn: () => fetchCryptoPrices(), refetchInterval: 15000 });
  const forex = useQuery({ queryKey: ["forex"], queryFn: fetchForexRates, refetchInterval: 10000 });

  const sjc = gold.data?.find((g) => g.id === "sjc-1l");
  const btc = crypto.data?.find((c) => c.symbol === "BTC");
  const usd = forex.data?.find((f) => f.code === "USD");

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={setSearch} />
      <main className="flex-1">
        <Hero
          goldSjc={sjc ? { sell: sjc.sell, changePct: sjc.changePct } : undefined}
          btc={btc ? { priceUsd: btc.priceUsd, change24h: btc.change24h } : undefined}
          usd={usd ? { sell: usd.sell, changePct: usd.changePct } : undefined}
        />

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
          <PriceChart />
          <ConverterTool />
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
