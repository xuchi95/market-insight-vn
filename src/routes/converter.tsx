import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ConverterTool } from "@/components/site/ConverterTool";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/converter`;
const TITLE = "Đổi ngoại tệ — Quy đổi USD, EUR, JPY, CNY sang VND realtime";
const DESC = "Công cụ đổi ngoại tệ trực tuyến: quy đổi USD, EUR, JPY, CNY, GBP, KRW, AUD, vàng và crypto sang VND theo tỷ giá thực tế, có tính chênh lệch mua–bán.";

const FAQ = [
  { q: "Công cụ đổi ngoại tệ này dùng tỷ giá nào?", a: "Tỷ giá ngoại tệ được lấy từ thị trường liên ngân hàng quốc tế (open.er-api.com) và cập nhật mỗi 10 phút; giá vàng từ PNJ và crypto từ CoinGecko." },
  { q: "Vì sao số tiền nhận thực tế khác với giá mid?", a: "Khi đổi ngoại tệ thực tế bạn bán theo giá mua của ngân hàng và mua theo giá bán — chênh lệch (spread) khiến số tiền nhận thấp hơn so với giá giữa (mid)." },
  { q: "Có thể đổi giữa hai ngoại tệ bất kỳ không?", a: "Có. Công cụ hỗ trợ đổi qua lại giữa VND và mọi loại ngoại tệ, vàng SJC/PNJ và các đồng crypto phổ biến như BTC, ETH." },
  { q: "Kết quả quy đổi có chính xác để giao dịch không?", a: "Kết quả chỉ mang tính tham khảo. Khi giao dịch thực tế bạn cần kiểm tra tỷ giá niêm yết tại ngân hàng/đại lý và cộng thêm phí dịch vụ nếu có." },
];

export const Route = createFileRoute("/converter")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "đổi ngoại tệ, quy đổi usd sang vnd, đổi eur sang vnd, đổi jpy sang vnd, đổi cny sang vnd, công cụ quy đổi tiền tệ, currency converter" },
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
            { "@type": "ListItem", position: 2, name: "Đổi ngoại tệ", item: URL },
          ],
        }),
      },
    ],
  }),
  component: ConverterPage,
});

function ConverterPage() {
  const [, setSearch] = useState("");
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={setSearch} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Trang chủ</Link></li>
              <li aria-hidden>/</li>
              <li className="text-foreground">Đổi ngoại tệ</li>
            </ol>
          </nav>
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Đổi ngoại tệ — Quy đổi USD, EUR, JPY, CNY sang VND</h1>
            <p className="text-muted-foreground max-w-2xl">
              Công cụ <strong>đổi ngoại tệ trực tuyến</strong> theo tỷ giá thực tế: hỗ trợ USD, EUR, JPY, CNY, GBP, KRW, AUD, vàng SJC/PNJ và crypto — tính chênh lệch do spread mua/bán.
            </p>
          </header>
          <ConverterTool />

          <section aria-labelledby="conv-info" className="prose prose-invert max-w-none space-y-4">
            <h2 id="conv-info" className="text-2xl font-bold tracking-tight">Cách dùng công cụ đổi ngoại tệ</h2>
            <p className="text-muted-foreground">
              Chọn loại tiền nguồn ở ô <em>Từ</em>, nhập số lượng cần đổi, sau đó chọn loại tiền đích ở ô <em>Sang</em>. Hệ thống tự động hiển thị số tiền nhận theo giá giữa (mid) và giá thực tế sau khi trừ spread mua–bán.
            </p>
            <h3 className="text-xl font-semibold">Hỗ trợ những loại tiền nào?</h3>
            <p className="text-muted-foreground">
              Hơn 10 ngoại tệ phổ biến (USD, EUR, GBP, JPY, CNY, KRW, SGD, AUD, CAD, CHF, HKD) — xem chi tiết tại trang <Link to="/forex" className="text-primary hover:underline">tỷ giá ngoại tệ hôm nay</Link>, <Link to="/gold" className="text-primary hover:underline">vàng miếng SJC/PNJ</Link> và các đồng <Link to="/crypto" className="text-primary hover:underline">crypto chủ chốt (BTC, ETH, BNB, SOL…)</Link>.
            </p>
            <h3 className="text-xl font-semibold">Spread mua–bán là gì?</h3>
            <p className="text-muted-foreground">
              Là chênh lệch giữa giá mua vào và giá bán ra của ngân hàng/đại lý. Spread càng lớn, chi phí đổi tiền càng cao — công cụ giúp bạn ước lượng phần thiệt hại này trước khi giao dịch thật. Đối chiếu thêm với <Link to="/bank-rates" className="text-primary hover:underline">tỷ giá Vietcombank niêm yết</Link>.
            </p>
          </section>

          <section aria-labelledby="conv-faq" className="space-y-4">
            <h2 id="conv-faq" className="text-2xl font-bold tracking-tight">Câu hỏi thường gặp</h2>
            <div className="divide-y divide-border rounded-xl border border-border/60 bg-card">
              {FAQ.map((f) => (
                <details key={f.q} className="group p-4">
                  <summary className="cursor-pointer font-semibold marker:hidden">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
          <RelatedLinks current="converter" />
        </div>
      </main>
      <Footer />
    </div>
  );
}