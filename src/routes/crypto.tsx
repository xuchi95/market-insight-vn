import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CryptoPriceTable } from "@/components/site/CryptoPriceTable";
import { PriceChart } from "@/components/site/PriceChart";

export const Route = createFileRoute("/crypto")({
  head: () => ({
    meta: [
      { title: "Giá Bitcoin, ETH, USDT realtime — MarketWatch" },
      { name: "description", content: "Cập nhật giá BTC, ETH, USDT, BNB, SOL, XRP, DOGE, TON và nhiều crypto khác theo thời gian thực." },
      { property: "og:title", content: "Giá crypto realtime — MarketWatch" },
      { property: "og:description", content: "Bảng giá tiền mã hoá cập nhật liên tục theo USD và VND." },
    ],
    links: [{ rel: "canonical", href: "/crypto" }],
  }),
  component: CryptoPage,
});

function CryptoPage() {
  const [search, setSearch] = useState("");
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={setSearch} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Giá tiền mã hoá realtime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Theo dõi giá Bitcoin, Ethereum, USDT, BNB, Solana, XRP, Dogecoin, TON… cập nhật liên tục từ thị trường toàn cầu.
            </p>
          </header>
          <CryptoPriceTable search={search} />
          <PriceChart />
        </div>
      </main>
      <Footer />
    </div>
  );
}