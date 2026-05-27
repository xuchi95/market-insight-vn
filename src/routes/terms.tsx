import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/terms`;
const TITLE = "Điều khoản sử dụng — MarketWatch";
const DESC = "Điều khoản sử dụng website MarketWatch. Quy định về quyền và nghĩa vụ của người dùng khi truy cập thông tin giá vàng, crypto, ngoại tệ.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
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
            { "@type": "ListItem", position: 2, name: "Điều khoản sử dụng", item: URL },
          ],
        }),
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Trang chủ</Link></li>
              <li aria-hidden>/</li>
              <li className="text-foreground">Điều khoản sử dụng</li>
            </ol>
          </nav>
          <header>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Điều khoản sử dụng</h1>
            <p className="mt-2 text-sm text-muted-foreground">Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}</p>
          </header>

          <section className="prose prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
            <h2 className="text-xl font-semibold text-foreground">1. Chấp nhận điều khoản</h2>
            <p>
              Khi truy cập và sử dụng MarketWatch, bạn xác nhận đã đọc, hiểu và đồng ý với toàn bộ Điều khoản sử dụng này cùng với <Link to="/disclaimer" className="text-foreground underline">Tuyên bố miễn trừ trách nhiệm</Link> và <Link to="/privacy" className="text-foreground underline">Chính sách dữ liệu</Link>. Nếu không đồng ý, vui lòng ngừng sử dụng Website.
            </p>

            <h2 className="text-xl font-semibold text-foreground">2. Mục đích sử dụng</h2>
            <p>
              Website được cung cấp với mục đích <strong>thông tin tham khảo phi thương mại</strong>. Người dùng cam kết sử dụng Website đúng pháp luật Việt Nam, không sử dụng dữ liệu để thực hiện các hành vi bị cấm.
            </p>

            <h2 className="text-xl font-semibold text-foreground">3. Hành vi bị cấm</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sử dụng Website để tuyên truyền chống Nhà nước, kích động bạo lực, vi phạm an ninh quốc gia theo Luật An ninh mạng 2018.</li>
              <li>Sử dụng dữ liệu để tổ chức huy động vốn, sàn giao dịch tài sản mã hoá, kinh doanh ngoại hối trái phép hoặc bất kỳ hoạt động tài chính chưa được cấp phép.</li>
              <li>Tự động thu thập (scrape), sao chép quy mô lớn, gây quá tải hệ thống hoặc can thiệp kỹ thuật vào Website.</li>
              <li>Phát tán mã độc, tấn công mạng dưới mọi hình thức.</li>
              <li>Sử dụng nội dung Website cho mục đích thương mại khi chưa có sự chấp thuận bằng văn bản.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">4. Quyền sở hữu trí tuệ</h2>
            <p>
              Giao diện, mã nguồn, văn bản và đồ hoạ trên Website thuộc sở hữu của MarketWatch và được bảo hộ theo Luật Sở hữu trí tuệ. Dữ liệu thị trường thuộc về các nhà cung cấp gốc tương ứng.
            </p>

            <h2 className="text-xl font-semibold text-foreground">5. Thay đổi điều khoản</h2>
            <p>
              MarketWatch có quyền cập nhật Điều khoản này bất kỳ lúc nào. Các thay đổi có hiệu lực ngay khi đăng tải. Việc tiếp tục sử dụng Website đồng nghĩa với việc bạn chấp nhận các thay đổi đó.
            </p>

            <h2 className="text-xl font-semibold text-foreground">6. Luật áp dụng</h2>
            <p>
              Điều khoản này được điều chỉnh và giải thích theo pháp luật nước Cộng hoà Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp sẽ được giải quyết tại Toà án có thẩm quyền tại Việt Nam.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}