import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StockIndexTable } from "@/components/site/StockIndexTable";
import { UsStockTable } from "@/components/site/UsStockTable";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/chung-khoan`;
const TITLE = "VN-Index hôm nay — Chỉ số VN30, HNX, UPCOM realtime";
const DESC = "Cập nhật VN-Index, VN30, HNX-Index, HNX30, UPCOM-Index hôm nay — điểm số, thay đổi, khối lượng giao dịch theo phiên gần nhất.";

export const Route = createFileRoute("/chung-khoan")({
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Bảng chỉ số chứng khoán Việt Nam hôm nay",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "VN-Index", item: { "@type": "Thing", name: "VN-Index", description: "Chỉ số VN-Index hôm nay — điểm số, thay đổi, khối lượng" } },
            { "@type": "ListItem", position: 2, name: "VN30", item: { "@type": "Thing", name: "VN30", description: "Chỉ số VN30 hôm nay — 30 mã vốn hóa lớn nhất" } },
            { "@type": "ListItem", position: 3, name: "HNX-Index", item: { "@type": "Thing", name: "HNX-Index", description: "Chỉ số HNX-Index hôm nay — sàn Hà Nội" } },
            { "@type": "ListItem", position: 4, name: "HNX30", item: { "@type": "Thing", name: "HNX30", description: "Chỉ số HNX30 hôm nay — 30 mã HNX" } },
            { "@type": "ListItem", position: 5, name: "UPCOM-Index", item: { "@type": "Thing", name: "UPCOM-Index", description: "Chỉ số UPCOM hôm nay — sàn UPCOM" } },
          ],
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
          </header>
          <StockIndexTable />
          <UsStockTable />
          <section aria-labelledby="popular-tickers" className="space-y-4">
            <h2 id="popular-tickers" className="text-2xl font-bold tracking-tight">Cổ phiếu Việt Nam phổ biến</h2>
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {["VNM","VCB","BID","CTG","TCB","MBB","VPB","ACB","HPG","HSG","FPT","MWG","PNJ","MSN","VIC","VHM","GAS","PLX","POW","SSI","VND","HCM","VJC","HVN"].map((t) => (
                <li key={t}>
                  <Link to="/co-phieu/$symbol" params={{ symbol: t.toLowerCase() }} className="block rounded-lg border border-border bg-card px-3 py-2 text-center font-semibold text-sm hover:border-[var(--gold)]/60 hover:text-[var(--gold)] transition-colors">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="prose prose-invert max-w-none space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">Về dữ liệu chỉ số</h2>
            <p className="text-muted-foreground">
              Dữ liệu được tổng hợp từ nguồn công khai (VNDirect) và mang tính tham khảo. Tỷ lệ thay đổi tính trên giá đóng cửa phiên trước. Trong giờ giao dịch, giá trị cập nhật mỗi vài phút; ngoài giờ giao dịch, hiển thị kết quả đóng cửa phiên gần nhất. Xem thêm <Link to="/ty-gia-ngoai-te" className="text-primary hover:underline">tỷ giá USD/VND hôm nay</Link>, <Link to="/gia-vang" className="text-primary hover:underline">giá vàng SJC</Link> và <Link to="/tien-dien-tu" className="text-primary hover:underline">giá Bitcoin</Link> để theo dõi toàn cảnh thị trường.
            </p>
          </section>
          <RelatedLinks current="stocks" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
