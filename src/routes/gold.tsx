import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GoldPriceTable } from "@/components/site/GoldPriceTable";
import { PriceChart } from "@/components/site/PriceChart";

export const Route = createFileRoute("/gold")({
  head: () => ({
    meta: [
      { title: "Giá vàng SJC, DOJI, PNJ realtime — MarketWatch" },
      { name: "description", content: "Cập nhật giá vàng SJC, DOJI, PNJ, Bảo Tín Minh Châu, Phú Quý, vàng thế giới XAU/USD theo thời gian thực." },
      { property: "og:title", content: "Giá vàng SJC, DOJI, PNJ realtime — MarketWatch" },
      { property: "og:description", content: "Bảng giá vàng trong nước và thế giới cập nhật liên tục." },
    ],
    links: [{ rel: "canonical", href: "/gold" }],
  }),
  component: GoldPage,
});

function GoldPage() {
  const [search, setSearch] = useState("");
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={setSearch} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Giá vàng realtime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Cập nhật giá vàng SJC, DOJI, PNJ, Bảo Tín Minh Châu, Phú Quý và vàng thế giới XAU/USD theo thời gian thực.
            </p>
          </header>
          <GoldPriceTable search={search} />
          <PriceChart />
        </div>
      </main>
      <Footer />
    </div>
  );
}