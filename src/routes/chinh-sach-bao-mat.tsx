import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/chinh-sach-bao-mat`;
const TITLE = "Chính sách dữ liệu & quyền riêng tư — MarketWatch";
const DESC = "Chính sách bảo vệ dữ liệu cá nhân của MarketWatch theo Nghị định 13/2023/NĐ-CP. Cách Website thu thập, sử dụng và bảo vệ thông tin người dùng.";

export const Route = createFileRoute("/chinh-sach-bao-mat")({
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
            { "@type": "ListItem", position: 2, name: "Chính sách quyền riêng tư", item: URL },
          ],
        }),
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <Breadcrumbs />
          <header>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Chính sách dữ liệu & quyền riêng tư</h1>
            <p className="mt-2 text-sm text-muted-foreground">Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân</p>
          </header>

          <section className="prose prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
            <h2 className="text-xl font-semibold text-foreground">1. Dữ liệu chúng tôi thu thập</h2>
            <p>
              MarketWatch là website hiển thị thông tin công khai và <strong>không yêu cầu đăng ký tài khoản</strong>. Chúng tôi chỉ thu thập tối thiểu các dữ liệu kỹ thuật phục vụ vận hành:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Nhật ký truy cập (địa chỉ IP, trình duyệt, thời điểm, trang đã xem) phục vụ thống kê và an ninh hệ thống.</li>
              <li>Cấu hình cá nhân lưu trên trình duyệt của bạn (cảnh báo giá, đơn vị hiển thị) — <strong>chỉ lưu trên localStorage thiết bị</strong>, không gửi về máy chủ.</li>
              <li>Email do bạn chủ động cung cấp khi liên hệ — sử dụng đúng mục đích phản hồi.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">2. Mục đích sử dụng</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Vận hành, bảo trì và cải thiện chất lượng Website.</li>
              <li>Phòng chống tấn công, lạm dụng dịch vụ.</li>
              <li>Thống kê ẩn danh về lượng truy cập.</li>
            </ul>
            <p>Chúng tôi <strong>không bán, không trao đổi</strong> dữ liệu cá nhân với bên thứ ba.</p>

            <h2 className="text-xl font-semibold text-foreground">3. Cookie</h2>
            <p>
              Website sử dụng cookie kỹ thuật cần thiết để duy trì phiên truy cập và lưu cấu hình hiển thị. Bạn có thể tắt cookie qua trình duyệt; một số chức năng có thể không hoạt động đầy đủ.
            </p>

            <h2 className="text-xl font-semibold text-foreground">4. Bảo mật</h2>
            <p>
              Chúng tôi áp dụng các biện pháp kỹ thuật hợp lý (HTTPS, kiểm soát truy cập, ghi log) để bảo vệ dữ liệu. Tuy nhiên, không có biện pháp nào tuyệt đối an toàn — bạn cần tự bảo vệ thiết bị cá nhân khi truy cập Internet.
            </p>

            <h2 className="text-xl font-semibold text-foreground">5. Quyền của chủ thể dữ liệu</h2>
            <p>
              Theo Nghị định 13/2023/NĐ-CP, bạn có quyền: được biết, đồng ý, truy cập, chỉnh sửa, xoá, hạn chế xử lý, phản đối xử lý và khiếu nại đối với dữ liệu cá nhân của mình. Vui lòng liên hệ <a href="mailto:contact@marketwatch.vn" className="text-foreground underline">contact@marketwatch.vn</a> để thực hiện các quyền này.
            </p>

            <h2 className="text-xl font-semibold text-foreground">6. Thay đổi chính sách</h2>
            <p>
              Chính sách có thể được cập nhật để phù hợp với pháp luật và thực tiễn vận hành. Phiên bản mới nhất luôn được đăng tải tại trang này.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}