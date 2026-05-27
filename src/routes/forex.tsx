import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ForexRateTable } from "@/components/site/ForexRateTable";
import { ConverterTool } from "@/components/site/ConverterTool";
import { PriceChart } from "@/components/site/PriceChart";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/forex`;
const TITLE = "Giá USD hôm nay — Tỷ giá EUR, JPY, CNY, GBP, KRW realtime";
const DESC = "Giá USD hôm nay, tỷ giá EUR, JPY, CNY, GBP, KRW, AUD sang VND cập nhật realtime — giá mua, giá bán, công cụ quy đổi nhanh ngoại tệ sang VND.";

const FAQ = [
  { q: "Giá USD hôm nay bao nhiêu VND?", a: "Giá USD hôm nay được MarketWatch cập nhật realtime mỗi 10 giây theo tỷ giá thị trường — bao gồm giá mua vào và bán ra quy đổi sang VND." },
  { q: "Tỷ giá EUR, JPY, CNY, GBP hôm nay tại MarketWatch lấy từ đâu?", a: "Tỷ giá được tổng hợp từ thị trường ngoại hối quốc tế và tham chiếu theo tỷ giá liên ngân hàng, cập nhật liên tục trong giờ giao dịch." },
  { q: "Giá mua và giá bán ngoại tệ khác nhau như thế nào?", a: "Giá mua là mức ngân hàng/đại lý mua ngoại tệ từ bạn; giá bán là mức họ bán ngoại tệ ra. Chênh lệch mua – bán là chi phí giao dịch bạn cần lưu ý." },
  { q: "Làm sao quy đổi nhanh USD, EUR sang VND?", a: "Sử dụng công cụ quy đổi ngoại tệ ngay trên trang này — nhập số tiền, chọn loại tiền và xem kết quả VND theo tỷ giá realtime." },
];

export const Route = createFileRoute("/forex")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "giá usd hôm nay, tỷ giá usd, tỷ giá eur, tỷ giá yên nhật, tỷ giá nhân dân tệ, tỷ giá cny, tỷ giá gbp, tỷ giá won, quy đổi ngoại tệ, tỷ giá ngoại tệ hôm nay" },
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
            { "@type": "ListItem", position: 2, name: "Tỷ giá ngoại tệ", item: URL },
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
          about: ["Tỷ giá USD", "Tỷ giá EUR", "Tỷ giá JPY", "Tỷ giá CNY"],
        }),
      },
    ],
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
          <Breadcrumbs />
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Giá USD hôm nay — Tỷ giá EUR, JPY, CNY, GBP realtime</h1>
            <p className="text-muted-foreground max-w-2xl">
              Cập nhật <strong>giá USD hôm nay</strong>, tỷ giá EUR, JPY, CNY, GBP, KRW, AUD… sang VND theo thời gian thực, kèm công cụ quy đổi nhanh và chính xác.
            </p>
          </header>
          <ForexRateTable search={search} />
          <PriceChart
            defaultAsset="usd-vnd"
            assets={["usd-vnd", "eur-vnd", "cny-vnd", "jpy-vnd", "gbp-vnd", "krw-vnd", "sgd-vnd", "aud-vnd"]}
          />
          <ConverterTool />

          <section aria-labelledby="forex-info" className="prose prose-invert max-w-none space-y-4">
            <h2 id="forex-info" className="text-2xl font-bold tracking-tight">Bảng tỷ giá ngoại tệ hôm nay</h2>
            <p className="text-muted-foreground">
              MarketWatch cập nhật <strong>giá USD</strong>, EUR, JPY, CNY (Nhân dân tệ), GBP, KRW (Won Hàn Quốc), AUD và nhiều ngoại tệ khác sang VND, làm mới mỗi 10 giây trong giờ giao dịch.
            </p>
            <h3 className="text-xl font-semibold">Quy đổi USD, EUR, CNY sang VND</h3>
            <p className="text-muted-foreground">
              Sử dụng <Link to="/converter" className="text-primary hover:underline">công cụ quy đổi tiền tệ</Link> để tính nhanh số tiền cần đổi giữa các loại ngoại tệ và VND theo tỷ giá realtime — phù hợp khi gửi tiền, du lịch hay nhập hàng quốc tế. Tham khảo thêm <Link to="/bank-rates" className="text-primary hover:underline">tỷ giá Vietcombank hôm nay</Link> trước khi giao dịch.
            </p>
            <h3 className="text-xl font-semibold">Vì sao tỷ giá ngoại tệ thay đổi liên tục?</h3>
            <p className="text-muted-foreground">
              Tỷ giá phụ thuộc vào cung – cầu, lãi suất, chính sách tiền tệ và thị trường thế giới. Theo dõi tỷ giá realtime giúp bạn chọn thời điểm giao dịch ngoại tệ tối ưu nhất. Liên quan: <Link to="/gold" className="text-primary hover:underline">giá vàng SJC hôm nay</Link>, <Link to="/crypto" className="text-primary hover:underline">giá Bitcoin hôm nay</Link>.
            </p>
          </section>

          <section aria-labelledby="forex-faq" className="space-y-4">
            <h2 id="forex-faq" className="text-2xl font-bold tracking-tight">Câu hỏi thường gặp về tỷ giá ngoại tệ</h2>
            <div className="divide-y divide-border rounded-xl border border-border/60 bg-card">
              {FAQ.map((f) => (
                <details key={f.q} className="group p-4">
                  <summary className="cursor-pointer font-semibold marker:hidden">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
          <RelatedLinks current="forex" />
        </div>
      </main>
      <Footer />
    </div>
  );
}