import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CompanyInfoCard } from "@/components/site/CompanyInfoCard";
import { PolicyToc } from "@/components/site/PolicyToc";
import { BackToTop } from "@/components/site/BackToTop";
import { ReadingProgress } from "@/components/site/ReadingProgress";
import { useRef } from "react";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/mien-tru-trach-nhiem`;
const TITLE = "Tuyên bố miễn trừ trách nhiệm — MarketWatch";
const DESC = "MarketWatch là công cụ phần mềm theo dõi và trực quan hoá dữ liệu thị trường tài chính. Số liệu giá vàng, tiền mã hoá, ngoại tệ chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.";

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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          inLanguage: "vi-VN",
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "MarketWatch", url: SITE },
          publisher: { "@type": "Organization", name: "MarketWatch", url: SITE },
        }),
      },
    ],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  const contentRef = useRef<HTMLElement>(null);
  return (
    <div className="min-h-screen flex flex-col">
      <ReadingProgress />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <Breadcrumbs />
          <header className="border-b border-border pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Văn bản pháp lý</p>
            <h1 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight leading-tight">Tuyên bố miễn trừ trách nhiệm</h1>
            <p className="mt-3 text-sm text-muted-foreground">Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}</p>
          </header>

          <PolicyToc contentRef={contentRef} />

          <section ref={contentRef} className="policy-prose prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">1. Tính chất thông tin</h2>
            <p>
              MarketWatch (sau đây gọi là “Website”) là <strong>công cụ phần mềm phân tích, trực quan hoá và hiển thị số liệu thị trường tài chính theo thời gian thực</strong> (giá vàng, tỷ giá ngoại tệ, lãi suất, giá tài sản mã hoá, chỉ số chứng khoán, giá nhiên liệu). Toàn bộ dữ liệu hiển thị được truy xuất tự động qua API từ các nguồn công khai của bên thứ ba (PNJ, SJC, ngân hàng thương mại, các sàn giao dịch quốc tế, nhà cung cấp dữ liệu thị trường) và <strong>không phải là báo giá chính thức</strong> của Website. Website <strong>không sản xuất, biên tập tin tức, bài viết</strong> và <strong>không cho phép người dùng đăng tải, chia sẻ nội dung công khai</strong>.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">2. Không phải khuyến nghị đầu tư</h2>
            <p>
              Mọi nội dung trên Website <strong>không cấu thành lời khuyên, tư vấn, mời chào, môi giới hay khuyến nghị đầu tư, mua, bán, nắm giữ</strong> bất kỳ tài sản, vàng, ngoại tệ hoặc tài sản mã hoá nào. Website không cung cấp dịch vụ tư vấn tài chính, chứng khoán, đầu tư hoặc thanh toán theo quy định của pháp luật Việt Nam.
            </p>
            <p>
              Người dùng tự chịu trách nhiệm về quyết định tài chính của mình và nên tham vấn chuyên gia, tổ chức được cấp phép trước khi giao dịch.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">3. Về tài sản mã hoá (crypto)</h2>
            <p>
              Theo quy định pháp luật Việt Nam hiện hành, <strong>tiền ảo, tài sản mã hoá không phải là phương tiện thanh toán hợp pháp tại Việt Nam</strong> (Nghị định 80/2016/NĐ-CP và các văn bản liên quan). Website chỉ hiển thị thông tin giá tham khảo từ thị trường quốc tế, <strong>không tổ chức, môi giới, làm đại lý hoặc cung cấp ví/giao dịch</strong> tài sản mã hoá. Người dùng tự chịu mọi rủi ro pháp lý và tài chính khi tham gia các thị trường này.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">4. Về giá vàng và ngoại tệ</h2>
            <p>
              Giá vàng và tỷ giá ngoại tệ hiển thị là dữ liệu tham khảo từ các tổ chức phát hành công khai, có thể <strong>chênh lệch, chậm trễ hoặc sai khác</strong> so với giá giao dịch thực tế tại các tổ chức tín dụng, doanh nghiệp kinh doanh vàng được Ngân hàng Nhà nước Việt Nam cấp phép. Để giao dịch thực tế, vui lòng liên hệ trực tiếp các đơn vị được cấp phép.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">5. Giới hạn trách nhiệm</h2>
            <p>
              Website nỗ lực bảo đảm tính chính xác và kịp thời của dữ liệu nhưng <strong>không cam kết, không bảo đảm</strong> và <strong>không chịu trách nhiệm</strong> đối với bất kỳ tổn thất, thiệt hại trực tiếp hoặc gián tiếp nào phát sinh từ việc người dùng sử dụng, tin cậy hoặc giao dịch dựa trên thông tin tại Website.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">6. Phân loại Website và tuân thủ pháp luật</h2>
            <p>
              MarketWatch là <strong>ứng dụng/công cụ phần mềm hiển thị số liệu thị trường tài chính</strong> được truy xuất tự động từ API công khai của bên thứ ba, hoạt động tương tự một máy tính tài chính (financial calculator) hoặc bảng giá điện tử (price ticker). Website <strong>KHÔNG PHẢI</strong> và <strong>không hoạt động dưới hình thức</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Trang thông tin điện tử tổng hợp</strong> theo Điều 25, Điều 30 Nghị định 147/2024/NĐ-CP: Website không trích dẫn, sao chép, biên tập lại tin tức, bài viết của cơ quan báo chí hoặc nguồn thông tin chính thức khác.</li>
              <li><strong>Trang thông tin điện tử cung cấp dịch vụ chuyên ngành</strong> trong các lĩnh vực có điều kiện kinh doanh: Website chỉ hiển thị số liệu công khai phục vụ tra cứu, không cung cấp dịch vụ tài chính, ngân hàng, chứng khoán, viễn thông, y tế, giáo dục… cần giấy phép chuyên ngành.</li>
              <li><strong>Mạng xã hội</strong> theo Điều 26 Nghị định 147/2024/NĐ-CP: Website không có chức năng cho phép người dùng tạo trang/hồ sơ cá nhân công khai, đăng tải, chia sẻ, bình luận, tương tác nội dung công khai với người dùng khác. Tài khoản (nếu có) chỉ phục vụ cá nhân hoá cảnh báo giá, danh mục theo dõi và nhận bản tin email riêng tư.</li>
              <li><strong>Báo điện tử, tạp chí điện tử</strong> theo Luật Báo chí 2016: Website không có tôn chỉ, mục đích báo chí, không có Tổng biên tập và không sản xuất tác phẩm báo chí.</li>
              <li><strong>Sàn giao dịch, trung gian thanh toán, môi giới</strong>: Website không tổ chức mua-bán, không khớp lệnh, không giữ tài sản, không trung gian thanh toán cho bất kỳ loại tài sản nào (vàng, ngoại tệ, chứng khoán, tài sản mã hoá).</li>
            </ul>
            <p>
              Do đó, Website <strong>không thuộc diện phải xin Giấy phép thiết lập trang thông tin điện tử tổng hợp, giấy phép mạng xã hội, giấy phép báo chí</strong> hoặc các giấy phép kinh doanh có điều kiện liên quan. Trường hợp cơ quan nhà nước có thẩm quyền yêu cầu phân loại lại hoặc bổ sung thủ tục, Website cam kết thực hiện đầy đủ theo quy định.
            </p>
            <p>
              Website hoạt động phù hợp với pháp luật Việt Nam, bao gồm Luật An ninh mạng 2018, Luật Giao dịch điện tử 2023, Nghị định 147/2024/NĐ-CP (thay thế Nghị định 72/2013/NĐ-CP và Nghị định 27/2018/NĐ-CP từ ngày có hiệu lực), Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và các văn bản hướng dẫn liên quan. Khi phát hiện nội dung sai sót hoặc có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền, Website sẽ phối hợp xử lý kịp thời.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">7. Liên hệ</h2>
            <p>
              Mọi phản ánh về nội dung, dữ liệu hoặc khiếu nại vui lòng gửi về: <a href="mailto:contact@marketwatch.vn" className="text-primary underline-offset-4 hover:underline font-medium">contact@marketwatch.vn</a>.
            </p>
            <CompanyInfoCard />
          </section>
        </div>
      </main>
      <BackToTop />
      <Footer />
    </div>
  );
}