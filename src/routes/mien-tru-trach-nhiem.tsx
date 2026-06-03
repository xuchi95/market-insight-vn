import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CompanyInfoCard } from "@/components/site/CompanyInfoCard";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/mien-tru-trach-nhiem`;
const TITLE = "Tuyên bố miễn trừ trách nhiệm — MarketWatch";
const DESC = "MarketWatch là kênh thông tin tham khảo. Dữ liệu giá vàng, tiền mã hoá, ngoại tệ chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.";

export const Route = createFileRoute("/mien-tru-trach-nhiem")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index,follow" },
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
            { "@type": "ListItem", position: 2, name: "Tuyên bố miễn trừ trách nhiệm", item: URL },
          ],
        }),
      },
    ],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <Breadcrumbs />
          <header>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Tuyên bố miễn trừ trách nhiệm</h1>
            <p className="mt-2 text-sm text-muted-foreground">Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}</p>
          </header>

          <section className="prose prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
            <h2 className="text-xl font-semibold text-foreground">1. Tính chất thông tin</h2>
            <p>
              MarketWatch (sau đây gọi là “Website”) là kênh <strong>tổng hợp và hiển thị thông tin tham khảo</strong> về giá vàng, tiền mã hoá (crypto) và tỷ giá ngoại tệ. Toàn bộ dữ liệu hiển thị được thu thập từ các nguồn công khai của bên thứ ba (PNJ, SJC, các sàn giao dịch quốc tế, API thị trường) và <strong>không phải là báo giá chính thức</strong> của Website.
            </p>

            <h2 className="text-xl font-semibold text-foreground">2. Không phải khuyến nghị đầu tư</h2>
            <p>
              Mọi nội dung trên Website <strong>không cấu thành lời khuyên, tư vấn, mời chào, môi giới hay khuyến nghị đầu tư, mua, bán, nắm giữ</strong> bất kỳ tài sản, vàng, ngoại tệ hoặc tài sản mã hoá nào. Website không cung cấp dịch vụ tư vấn tài chính, chứng khoán, đầu tư hoặc thanh toán theo quy định của pháp luật Việt Nam.
            </p>
            <p>
              Người dùng tự chịu trách nhiệm về quyết định tài chính của mình và nên tham vấn chuyên gia, tổ chức được cấp phép trước khi giao dịch.
            </p>

            <h2 className="text-xl font-semibold text-foreground">3. Về tài sản mã hoá (crypto)</h2>
            <p>
              Theo quy định pháp luật Việt Nam hiện hành, <strong>tiền ảo, tài sản mã hoá không phải là phương tiện thanh toán hợp pháp tại Việt Nam</strong> (Nghị định 80/2016/NĐ-CP và các văn bản liên quan). Website chỉ hiển thị thông tin giá tham khảo từ thị trường quốc tế, <strong>không tổ chức, môi giới, làm đại lý hoặc cung cấp ví/giao dịch</strong> tài sản mã hoá. Người dùng tự chịu mọi rủi ro pháp lý và tài chính khi tham gia các thị trường này.
            </p>

            <h2 className="text-xl font-semibold text-foreground">4. Về giá vàng và ngoại tệ</h2>
            <p>
              Giá vàng và tỷ giá ngoại tệ hiển thị là dữ liệu tham khảo từ các tổ chức phát hành công khai, có thể <strong>chênh lệch, chậm trễ hoặc sai khác</strong> so với giá giao dịch thực tế tại các tổ chức tín dụng, doanh nghiệp kinh doanh vàng được Ngân hàng Nhà nước Việt Nam cấp phép. Để giao dịch thực tế, vui lòng liên hệ trực tiếp các đơn vị được cấp phép.
            </p>

            <h2 className="text-xl font-semibold text-foreground">5. Giới hạn trách nhiệm</h2>
            <p>
              Website nỗ lực bảo đảm tính chính xác và kịp thời của dữ liệu nhưng <strong>không cam kết, không bảo đảm</strong> và <strong>không chịu trách nhiệm</strong> đối với bất kỳ tổn thất, thiệt hại trực tiếp hoặc gián tiếp nào phát sinh từ việc người dùng sử dụng, tin cậy hoặc giao dịch dựa trên thông tin tại Website.
            </p>

            <h2 className="text-xl font-semibold text-foreground">6. Phân loại Website và tuân thủ pháp luật</h2>
            <p>
              MarketWatch được phân loại là <strong>trang thông tin điện tử cung cấp dịch vụ chuyên ngành</strong> về dữ liệu thị trường tài chính (giá vàng, tỷ giá ngoại tệ, lãi suất, giá tài sản mã hoá, chỉ số chứng khoán, giá nhiên liệu) theo Điều 26 và Điều 30 Nghị định 147/2024/NĐ-CP. Website <strong>KHÔNG PHẢI</strong> trang thông tin điện tử tổng hợp, không sao chép, biên tập lại tin tức, bài viết của cơ quan báo chí, do đó không thuộc diện phải xin Giấy phép thiết lập trang thông tin điện tử tổng hợp theo Điều 25 Nghị định 147/2024/NĐ-CP.
            </p>
            <p>
              Website hoạt động phù hợp với pháp luật Việt Nam, bao gồm Luật An ninh mạng 2018, Luật Giao dịch điện tử 2023, Nghị định 147/2024/NĐ-CP (thay thế Nghị định 72/2013/NĐ-CP và Nghị định 27/2018/NĐ-CP từ ngày có hiệu lực), Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và các văn bản hướng dẫn liên quan. Khi phát hiện nội dung sai sót hoặc có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền, Website sẽ phối hợp xử lý kịp thời.
            </p>

            <h2 className="text-xl font-semibold text-foreground">7. Liên hệ</h2>
            <p>
              Mọi phản ánh về nội dung, dữ liệu hoặc khiếu nại vui lòng gửi về: <a href="mailto:contact@marketwatch.vn" className="text-foreground underline">contact@marketwatch.vn</a>.
            </p>
            <CompanyInfoCard />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}