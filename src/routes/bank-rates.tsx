import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BankRateTable } from "@/components/site/BankRateTable";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/bank-rates`;
const TITLE = "Tỷ giá Vietcombank hôm nay — USD, EUR, JPY, CNY";
const DESC = "Tỷ giá Ngân hàng Vietcombank hôm nay: USD, EUR, JPY, CNY, GBP, KRW, SGD và nhiều ngoại tệ khác — giá mua tiền mặt, mua chuyển khoản và bán ra chính thức.";

export const Route = createFileRoute("/bank-rates")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "tỷ giá vietcombank, vcb, tỷ giá ngân hàng, tỷ giá usd vietcombank, tỷ giá eur vietcombank, tỷ giá hôm nay" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BankRatesPage,
});

function BankRatesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Trang chủ</Link></li>
              <li aria-hidden>/</li>
              <li className="text-foreground">Tỷ giá ngân hàng</li>
            </ol>
          </nav>
          <header className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Tỷ giá Vietcombank hôm nay</h1>
            <p className="text-muted-foreground max-w-2xl">
              Bảng tỷ giá ngoại tệ niêm yết chính thức của <strong>Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)</strong> — giá mua tiền mặt, mua chuyển khoản và bán ra theo VND.
            </p>
          </header>
          <BankRateTable />
          <section className="prose prose-invert max-w-none space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">Về dữ liệu tỷ giá</h2>
            <p className="text-muted-foreground">
              Tỷ giá được lấy trực tiếp từ trang chính thức của Vietcombank và mang tính tham khảo. Vietcombank có thể điều chỉnh tỷ giá nhiều lần trong ngày; vui lòng đối chiếu với ngân hàng trước khi giao dịch giá trị lớn.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
