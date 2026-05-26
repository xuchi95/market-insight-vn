import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CryptoPriceTable } from "@/components/site/CryptoPriceTable";
import { PriceChart } from "@/components/site/PriceChart";
import { PriceAlerts } from "@/components/site/PriceAlerts";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/crypto`;
const TITLE = "Giá Bitcoin hôm nay — Giá BTC, ETH, USDT, BNB, SOL realtime";
const DESC = "Giá BTC hôm nay, giá Bitcoin, Ethereum, USDT, BNB, Solana, XRP, Dogecoin, TON cập nhật realtime theo USD và VND — vốn hoá, volume 24h và biến động giá.";

const FAQ = [
  { q: "Giá Bitcoin (BTC) hôm nay bao nhiêu USD?", a: "Giá BTC hôm nay được MarketWatch cập nhật realtime mỗi 15 giây từ thị trường crypto toàn cầu. Bạn xem giá USD và quy đổi sang VND trực tiếp trên bảng giá phía trên." },
  { q: "Giá ETH, USDT, BNB, SOL hôm nay tính theo gì?", a: "Tất cả coin niêm yết theo USD theo giá trung bình thị trường toàn cầu, sau đó quy đổi sang VND theo tỷ giá USD/VND mới nhất." },
  { q: "Vốn hoá thị trường (market cap) là gì?", a: "Vốn hoá = giá hiện tại × lượng cung lưu hành. Đây là chỉ số quan trọng để so sánh quy mô giữa các đồng coin như BTC, ETH, BNB." },
  { q: "MarketWatch cập nhật giá coin bao lâu một lần?", a: "Bảng giá crypto tự động làm mới mỗi 15 giây, đảm bảo bạn luôn theo dõi giá Bitcoin và altcoin sát với thị trường." },
];

export const Route = createFileRoute("/crypto")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "giá btc hôm nay, giá bitcoin hôm nay, giá eth hôm nay, giá usdt hôm nay, giá bnb, giá solana, giá xrp, giá dogecoin, giá coin realtime, tiền mã hoá" },
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
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Giá crypto", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
          about: ["Bitcoin", "Ethereum", "USDT", "BNB", "Solana"],
        }),
      },
    ],
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
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Trang chủ</Link></li>
              <li aria-hidden>/</li>
              <li className="text-foreground">Giá crypto</li>
            </ol>
          </nav>
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Giá Bitcoin hôm nay — BTC, ETH, USDT, BNB, SOL realtime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Cập nhật <strong>giá BTC hôm nay</strong>, giá Ethereum, USDT, BNB, Solana, XRP, Dogecoin, TON… theo USD và VND, làm mới liên tục từ thị trường crypto toàn cầu.
            </p>
          </header>
          <CryptoPriceTable search={search} />
          <PriceAlerts />
          <PriceChart defaultAsset="btc" assets={["btc", "eth"]} />

          <section aria-labelledby="crypto-info" className="prose prose-invert max-w-none space-y-4">
            <h2 id="crypto-info" className="text-2xl font-bold tracking-tight">Theo dõi giá Bitcoin và altcoin realtime</h2>
            <p className="text-muted-foreground">
              MarketWatch tổng hợp <strong>giá Bitcoin (BTC)</strong>, Ethereum (ETH), USDT, BNB, Solana (SOL), XRP, Dogecoin (DOGE), TON và hàng trăm đồng coin khác. Giá được cập nhật mỗi 15 giây cùng với vốn hoá, volume 24h và biến động giá.
            </p>
            <h3 className="text-xl font-semibold">Quy đổi giá coin sang VND</h3>
            <p className="text-muted-foreground">
              Mỗi coin đều được quy đổi sang VND theo tỷ giá USD/VND mới nhất, giúp nhà đầu tư Việt Nam dễ dàng nắm bắt giá trị thực tế tại thị trường trong nước.
            </p>
            <h3 className="text-xl font-semibold">Vì sao nên theo dõi giá crypto realtime?</h3>
            <p className="text-muted-foreground">
              Thị trường crypto hoạt động 24/7 với biên độ dao động cao. Theo dõi giá BTC, ETH realtime giúp bạn ra quyết định nhanh và chính xác hơn.
            </p>
          </section>

          <section aria-labelledby="crypto-faq" className="space-y-4">
            <h2 id="crypto-faq" className="text-2xl font-bold tracking-tight">Câu hỏi thường gặp về giá crypto</h2>
            <div className="divide-y divide-border rounded-xl border border-border/60 bg-card">
              {FAQ.map((f) => (
                <details key={f.q} className="group p-4">
                  <summary className="cursor-pointer font-semibold marker:hidden">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}