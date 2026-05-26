import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ForexRateTable } from "@/components/site/ForexRateTable";
import { ConverterTool } from "@/components/site/ConverterTool";

export const Route = createFileRoute("/forex")({
  head: () => ({
    meta: [
      { title: "Tỷ giá ngoại tệ USD, EUR, CNY realtime — MarketWatch" },
      { name: "description", content: "Cập nhật tỷ giá USD, EUR, JPY, CNY, GBP, KRW, AUD và nhiều ngoại tệ khác theo thời gian thực." },
      { property: "og:title", content: "Tỷ giá ngoại tệ realtime — MarketWatch" },
      { property: "og:description", content: "Bảng tỷ giá ngoại tệ cập nhật liên tục, quy đổi nhanh sang VND." },
    ],
    links: [{ rel: "canonical", href: "/forex" }],
  }),
  component: ForexPage,
});

function ForexPage() {
  const [search, setSearch] = useState("");
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={setSearch} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Tỷ giá ngoại tệ realtime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Cập nhật tỷ giá USD, EUR, JPY, CNY, GBP, KRW, AUD… và công cụ quy đổi nhanh sang VND.
            </p>
          </header>
          <ForexRateTable search={search} />
          <ConverterTool />
        </div>
      </main>
      <Footer />
    </div>
  );
}