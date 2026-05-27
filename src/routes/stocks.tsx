import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StockIndexTable } from "@/components/site/StockIndexTable";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/stocks`;
const TITLE = "VN-Index hôm nay — Chỉ số VN30, HNX, UPCOM realtime";
const DESC = "Cập nhật VN-Index, VN30, HNX-Index, HNX30, UPCOM-Index hôm nay — điểm số, thay đổi, khối lượng giao dịch theo phiên gần nhất.";

export const Route = createFileRoute("/stocks")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "vn-index, vnindex hôm nay, vn30, hnx-index, hnx30, upcom, chỉ số chứng khoán, chứng khoán việt nam" },
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
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Chứng khoán", item: URL },
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
          about: ["VN-Index", "VN30", "HNX-Index", "UPCOM"],
        }),
      },
    ],
  }),
  component: StocksPage,
});

function StocksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <Breadcrumbs />
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">VN-Index hôm nay — Chỉ số chứng khoán Việt Nam</h1>
            <p className="text-muted-foreground max-w-2xl">
              Theo dõi <strong>VN-Index</strong>, <strong>VN30</strong>, <strong>HNX-Index</strong>, <strong>HNX30</strong> và <strong>UPCOM-Index</strong> theo phiên giao dịch gần nhất — điểm số, thay đổi, khối lượng khớp lệnh.
            </p>
          </header>
          <StockIndexTable />
          <section className="prose prose-invert max-w-none space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">Về dữ liệu chỉ số</h2>
            <p className="text-muted-foreground">
              Dữ liệu được tổng hợp từ nguồn công khai (VNDirect) và mang tính tham khảo. Tỷ lệ thay đổi tính trên giá đóng cửa phiên trước. Trong giờ giao dịch, giá trị cập nhật mỗi vài phút; ngoài giờ giao dịch, hiển thị kết quả đóng cửa phiên gần nhất. Xem thêm <Link to="/forex" className="text-primary hover:underline">tỷ giá USD/VND hôm nay</Link>, <Link to="/gold" className="text-primary hover:underline">giá vàng SJC</Link> và <Link to="/crypto" className="text-primary hover:underline">giá Bitcoin</Link> để theo dõi toàn cảnh thị trường.
            </p>
          </section>
          <RelatedLinks current="stocks" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
