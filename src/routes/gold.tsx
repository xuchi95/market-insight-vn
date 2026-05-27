import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GoldPriceTable } from "@/components/site/GoldPriceTable";
import { PriceChart } from "@/components/site/PriceChart";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/gold`;
const TITLE = "Giá vàng SJC hôm nay — DOJI, PNJ, BTMC, XAU/USD realtime";
const DESC = "Giá vàng SJC hôm nay, giá vàng DOJI, PNJ, Bảo Tín Minh Châu, Phú Quý và giá vàng thế giới XAU/USD cập nhật realtime theo phút. Mua vào, bán ra, biểu đồ và lịch sử.";

const FAQ = [
  { q: "Giá vàng SJC hôm nay bao nhiêu 1 lượng?", a: "Giá vàng SJC hôm nay được MarketWatch cập nhật realtime mỗi vài giây theo nguồn dữ liệu thị trường trong nước. Bạn xem giá mua vào – bán ra trực tiếp ở bảng phía trên." },
  { q: "Giá vàng DOJI, PNJ, BTMC, Phú Quý có khác nhau không?", a: "Có. Mỗi thương hiệu niêm yết giá vàng miếng, nhẫn tròn trơn và vàng nữ trang khác nhau với mức chênh lệch mua – bán riêng. MarketWatch hiển thị song song để bạn dễ so sánh." },
  { q: "Giá vàng thế giới XAU/USD tính theo đơn vị gì?", a: "Vàng thế giới (XAU/USD) yết theo USD trên một ounce (≈ 31,1035 gram). Quy đổi sang VND/lượng cần nhân với tỷ giá USD/VND và hệ số quy đổi đơn vị." },
  { q: "Bao lâu MarketWatch cập nhật giá vàng một lần?", a: "Bảng giá vàng tự động làm mới mỗi 5 giây, đảm bảo bạn luôn xem được giá vàng hôm nay sát thị trường nhất." },
];

export const Route = createFileRoute("/gold")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "giá vàng sjc hôm nay, giá vàng hôm nay, giá vàng doji, giá vàng pnj, giá vàng bảo tín minh châu, giá vàng phú quý, giá vàng 9999, giá vàng nhẫn, giá vàng thế giới, xau usd" },
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
            { "@type": "ListItem", position: 2, name: "Giá vàng", item: URL },
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
          about: ["Giá vàng SJC", "Giá vàng DOJI", "Giá vàng PNJ", "XAU/USD"],
        }),
      },
    ],
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
          <Breadcrumbs />
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Giá vàng SJC hôm nay — DOJI, PNJ, BTMC realtime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Cập nhật <strong>giá vàng SJC hôm nay</strong>, giá vàng DOJI, PNJ, Bảo Tín Minh Châu, Phú Quý và giá vàng thế giới XAU/USD theo thời gian thực — mua vào, bán ra, chênh lệch và biến động trong ngày.
            </p>
          </header>
          <GoldPriceTable search={search} />
          <PriceChart defaultAsset="gold-sjc" assets={["gold-sjc"]} />

          <section aria-labelledby="gold-info" className="prose prose-invert max-w-none space-y-4">
            <h2 id="gold-info" className="text-2xl font-bold tracking-tight">Bảng giá vàng hôm nay cập nhật liên tục</h2>
            <p className="text-muted-foreground">
              MarketWatch tổng hợp <strong>giá vàng SJC</strong>, giá vàng miếng và nhẫn tròn trơn của các thương hiệu lớn nhất Việt Nam: <strong>SJC, DOJI, PNJ, Bảo Tín Minh Châu (BTMC), Phú Quý, Mi Hồng</strong>. Dữ liệu được cập nhật mỗi 5 giây để bạn luôn nắm bắt giá mua vào – bán ra mới nhất trong ngày.
            </p>
            <h3 className="text-xl font-semibold">Giá vàng thế giới XAU/USD</h3>
            <p className="text-muted-foreground">
              Bên cạnh giá vàng trong nước, MarketWatch hiển thị <strong>giá vàng thế giới XAU/USD</strong> theo ounce — chỉ báo quan trọng ảnh hưởng đến giá vàng Việt Nam mỗi ngày. Bạn có thể quy đổi XAU/USD sang VND nhanh bằng <Link to="/converter" className="text-primary hover:underline">công cụ đổi ngoại tệ</Link> hoặc đối chiếu với <Link to="/forex" className="text-primary hover:underline">tỷ giá USD/VND hôm nay</Link>.
            </p>
            <h3 className="text-xl font-semibold">Vì sao nên theo dõi giá vàng realtime?</h3>
            <p className="text-muted-foreground">
              Giá vàng biến động theo cung – cầu, <Link to="/forex" className="text-primary hover:underline">tỷ giá USD/VND</Link> và giá vàng thế giới. Theo dõi giá vàng realtime giúp bạn lựa chọn thời điểm mua – bán hợp lý, tránh chênh lệch lớn giữa các thương hiệu. Quan tâm thị trường khác? Xem thêm <Link to="/crypto" className="text-primary hover:underline">giá Bitcoin hôm nay</Link>.
            </p>
          </section>

          <section aria-labelledby="gold-faq" className="space-y-4">
            <h2 id="gold-faq" className="text-2xl font-bold tracking-tight">Câu hỏi thường gặp về giá vàng</h2>
            <div className="divide-y divide-border rounded-xl border border-border/60 bg-card">
              {FAQ.map((f) => (
                <details key={f.q} className="group p-4">
                  <summary className="cursor-pointer font-semibold marker:hidden">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
          <RelatedLinks current="gold" />
        </div>
      </main>
      <Footer />
    </div>
  );
}