import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { GoldPriceTable } from "@/components/site/GoldPriceTable";
import { CryptoPriceTable } from "@/components/site/CryptoPriceTable";
import { ForexRateTable } from "@/components/site/ForexRateTable";
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
  const [search, setSearch] = useState("");

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
          <GoldPriceTable search={search} />
          <CryptoPriceTable search={search} />
          <ForexRateTable search={search} />
          <PriceChart />
          <ConverterTool />
          <NewsSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
