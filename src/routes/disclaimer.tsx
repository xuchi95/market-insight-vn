import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const SITE = "https://market-insight-vn.lovable.app";
const URL = `${SITE}/disclaimer`;
const TITLE = "Tuyên bố miễn trừ trách nhiệm — MarketWatch";
const DESC = "MarketWatch là kênh thông tin tham khảo. Dữ liệu giá vàng, tiền mã hoá, ngoại tệ chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="hover:text-foreground">Trang chủ</Link></li>
              <li aria-hidden>/</li>
              <li className="text-foreground">Tuyên bố miễn trừ trách nhiệm</li>
            </ol>
          </nav>
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

            <h2 className="text-xl font-semibold text-foreground">6. Tuân thủ pháp luật</h2>
            <p>
              Website hoạt động phù hợp với pháp luật Việt Nam, bao gồm Luật An ninh mạng 2018, Luật Giao dịch điện tử, Nghị định 72/2013/NĐ-CP và các văn bản hướng dẫn. Khi phát hiện nội dung sai sót hoặc có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền, Website sẽ phối hợp xử lý kịp thời.
            </p>

            <h2 className="text-xl font-semibold text-foreground">7. Liên hệ</h2>
            <p>
              Mọi phản ánh về nội dung, dữ liệu hoặc khiếu nại vui lòng gửi về: <a href="mailto:contact@marketwatch.vn" className="text-foreground underline">contact@marketwatch.vn</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}