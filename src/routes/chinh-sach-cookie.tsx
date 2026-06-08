import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CompanyInfoCard } from "@/components/site/CompanyInfoCard";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/chinh-sach-cookie`;
const TITLE = "Chính sách Cookie — MarketWatch";
const DESC = "Chính sách sử dụng cookie và công nghệ tương tự của MarketWatch — tuân thủ Nghị định 13/2023/NĐ-CP, Luật An ninh mạng và quy định pháp luật Việt Nam.";

export const Route = createFileRoute("/chinh-sach-cookie")({
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
            { "@type": "ListItem", position: 2, name: "Chính sách Cookie", item: URL },
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
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  const updated = new Date().toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <Breadcrumbs />
          <header>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Chính sách Cookie</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Áp dụng từ ngày {updated} · Phiên bản 1.0 · Tuân thủ Nghị định 13/2023/NĐ-CP, Luật An ninh mạng 2018, Luật Giao dịch điện tử 2023, Luật Bảo vệ quyền lợi người tiêu dùng 2023.
            </p>
          </header>

          <section className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-[15px] leading-7 text-muted-foreground">
            <p>
              Chính sách Cookie này (“Chính sách”) giải thích cách <strong>MarketWatch</strong> (sau đây gọi là “Chúng tôi”, “Website”) sử dụng cookie và các công nghệ lưu trữ cục bộ tương tự (LocalStorage, SessionStorage, IndexedDB, pixel, tag, fingerprint kỹ thuật) khi Bạn truy cập tên miền <a href="https://marketwatch.vn" className="text-primary underline-offset-4 hover:underline font-medium">marketwatch.vn</a> và các tên miền phụ. Chính sách này là một phần không tách rời của <Link to="/chinh-sach-bao-mat" className="text-primary underline-offset-4 hover:underline font-medium">Chính sách dữ liệu &amp; quyền riêng tư</Link> và <Link to="/dieu-khoan-su-dung" className="text-primary underline-offset-4 hover:underline font-medium">Điều khoản sử dụng</Link>.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">1. Cookie là gì?</h2>
            <p>
              Cookie là tập tin văn bản dung lượng nhỏ được trình duyệt của Bạn lưu trên thiết bị truy cập khi Bạn ghé thăm một website. Cookie giúp website nhận diện thiết bị, ghi nhớ tuỳ chọn, duy trì phiên đăng nhập, đo lường hiệu năng và bảo đảm an toàn. Bên cạnh cookie HTTP truyền thống, Website còn sử dụng các công nghệ tương tự như <em>LocalStorage</em>, <em>SessionStorage</em>, <em>IndexedDB</em> và mã định danh phiên trong URL để cung cấp dịch vụ. Trong toàn bộ Chính sách này, thuật ngữ “Cookie” bao gồm tất cả các công nghệ vừa liệt kê.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">2. Cơ sở pháp lý sử dụng Cookie</h2>
            <p>Việc sử dụng Cookie tại Website căn cứ vào:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Nghị định 13/2023/NĐ-CP ngày 17/4/2023 về bảo vệ dữ liệu cá nhân.</li>
              <li>Luật An toàn thông tin mạng 2015, Luật An ninh mạng 2018, Luật Giao dịch điện tử 2023.</li>
              <li>Luật Bảo vệ quyền lợi người tiêu dùng 2023 và Nghị định 52/2013/NĐ-CP về thương mại điện tử.</li>
              <li>Sự đồng ý hợp lệ của Chủ thể dữ liệu được thể hiện qua thao tác bấm “Đồng ý” hoặc tiếp tục sử dụng Website sau khi đã được thông báo rõ ràng.</li>
              <li>Lợi ích chính đáng của Bên Kiểm soát dữ liệu trong việc duy trì an ninh hệ thống, chống gian lận, chống tấn công mạng — đối với Cookie thiết yếu.</li>
            </ul>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">3. Phân loại Cookie Chúng tôi sử dụng</h2>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-1">3.1. Cookie thiết yếu (Strictly Necessary)</h3>
            <p>
              Bắt buộc để Website vận hành. Không thể vô hiệu hoá vì nếu thiếu, Bạn sẽ không thể đăng nhập, không thể gửi biểu mẫu, không thể duy trì giỏ tính năng hoặc trạng thái bảo mật. Theo quy định pháp luật và thực tiễn quốc tế (ePrivacy, GDPR Recital 30), Cookie thiết yếu KHÔNG yêu cầu sự đồng ý.
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><code>sb-access-token</code>, <code>sb-refresh-token</code>: token xác thực phiên đăng nhập (HTTP-only, Secure, SameSite=Lax).</li>
              <li><code>mw_theme</code>: lưu chế độ giao diện sáng/tối Bạn đã chọn.</li>
              <li><code>mw_number_format</code>: lưu định dạng số (VN/EN) Bạn đã chọn.</li>
              <li><code>mw_csrf</code>: token chống tấn công giả mạo yêu cầu (CSRF).</li>
              <li><code>mw_cookie_consent</code>: ghi nhận lựa chọn của Bạn đối với chính banner Cookie này (hiệu lực 12 tháng).</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-1">3.2. Cookie chức năng (Functional)</h3>
            <p>Ghi nhớ tuỳ chọn cá nhân hoá để tăng trải nghiệm. Có thể từ chối; khi từ chối, một số tính năng vẫn hoạt động nhưng Bạn sẽ phải thiết lập lại trong mỗi phiên.</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><code>mw_watchlist_view</code>: ghi nhớ chế độ hiển thị danh sách theo dõi.</li>
              <li><code>mw_chart_settings</code>: ghi nhớ khung thời gian, chỉ báo kỹ thuật trên biểu đồ.</li>
              <li><code>mw_dismissed_popups</code>: lưu trạng thái các thông báo Bạn đã đóng.</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-1">3.3. Cookie phân tích (Analytics)</h3>
            <p>Giúp Chúng tôi đo lường lưu lượng, hành vi tương tác, tốc độ tải trang để cải thiện chất lượng. Dữ liệu được tổng hợp ẩn danh, không nhằm nhận dạng cá nhân cụ thể.</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Cookie nội bộ của hệ thống đo lường hiệu năng do Chúng tôi tự vận hành.</li>
              <li>Cookie của bên thứ ba (nếu được kích hoạt): Cloudflare Web Analytics, Google Analytics 4 với IP đã ẩn danh.</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-1">3.4. Cookie tiếp thị (Marketing)</h3>
            <p>
              Hiện tại, Website <strong>không chạy quảng cáo hành vi (behavioral advertising)</strong> và không bán dữ liệu cá nhân cho bên thứ ba phục vụ mục đích tiếp thị. Nếu trong tương lai có triển khai, Chúng tôi sẽ cập nhật Chính sách và xin sự đồng ý mới của Bạn theo Điều 11 Nghị định 13/2023/NĐ-CP.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">4. Cookie của bên thứ ba</h2>
            <p>Một số đối tác kỹ thuật có thể đặt Cookie khi Bạn sử dụng Website nhằm cung cấp hạ tầng, an toàn và phân phối nội dung:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Cloudflare, Inc.</strong> — CDN, chống DDoS, phát hiện bot; cookie <code>__cf_bm</code>, <code>cf_clearance</code> (thiết yếu cho an ninh).</li>
              <li><strong>Supabase Inc.</strong> — nền tảng xác thực và cơ sở dữ liệu; lưu token phiên trong LocalStorage.</li>
              <li><strong>Postmark</strong> (ActiveCampaign LLC) — pixel theo dõi mở email trong các bản tin Bạn đã đăng ký (có thể tắt trong cài đặt email).</li>
            </ul>
            <p>
              Chúng tôi không kiểm soát Cookie do bên thứ ba đặt ngoài phạm vi tích hợp đã công bố. Khi truy cập liên kết ra ngoài Website (ví dụ tới sàn giao dịch, nguồn dữ liệu), Bạn chịu sự điều chỉnh của chính sách cookie của bên đó.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">5. Thời hạn lưu trữ Cookie</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Cookie phiên (session):</strong> tự động xoá khi Bạn đóng trình duyệt.</li>
              <li><strong>Cookie cố định (persistent):</strong> tối đa 12 tháng kể từ lần truy cập gần nhất, sau đó tự động hết hạn.</li>
              <li><strong>Cookie ghi nhận đồng ý (<code>mw_cookie_consent</code>):</strong> 12 tháng, sau thời hạn này Chúng tôi sẽ xin lại sự đồng ý.</li>
              <li><strong>Nhật ký kỹ thuật phục vụ an ninh mạng:</strong> lưu trữ tối thiểu 24 tháng theo Điều 26 Luật An ninh mạng 2018 và Nghị định 53/2022/NĐ-CP.</li>
            </ul>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">6. Quyền của Bạn đối với Cookie</h2>
            <p>Phù hợp với Điều 9 Nghị định 13/2023/NĐ-CP, Bạn có các quyền sau đối với Cookie và dữ liệu phát sinh từ Cookie:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Quyền được biết — đọc Chính sách này và bảng kê Cookie nêu trên.</li>
              <li>Quyền đồng ý hoặc rút lại sự đồng ý — qua banner Cookie hoặc trang <em>“Quản lý Cookie”</em> trong phần chân Website.</li>
              <li>Quyền truy cập, chỉnh sửa, xoá dữ liệu cá nhân phát sinh từ Cookie — gửi yêu cầu theo Mục 9.</li>
              <li>Quyền hạn chế hoặc phản đối việc xử lý — Bạn có thể chặn Cookie trong cài đặt trình duyệt bất cứ lúc nào.</li>
              <li>Quyền khiếu nại tới cơ quan có thẩm quyền — Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05) – Bộ Công an.</li>
            </ul>
            <p>
              <strong>Lưu ý:</strong> Nếu Bạn từ chối Cookie thiết yếu hoặc xoá thủ công, Website có thể không hoạt động đúng. Trong trường hợp đó, MarketWatch không chịu trách nhiệm với bất kỳ tổn thất, sai lệch dữ liệu hoặc gián đoạn dịch vụ nào phát sinh.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">7. Cách quản lý và tắt Cookie</h2>
            <p>Bạn có thể chủ động quản lý Cookie theo các cách sau:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Bấm nút <em>“Quản lý Cookie”</em> trên banner đồng ý xuất hiện ở chân trang để thay đổi lựa chọn bất kỳ lúc nào.</li>
              <li>Xoá Cookie và dữ liệu trang trong cài đặt trình duyệt (Chrome, Edge, Safari, Firefox, Cốc Cốc đều hỗ trợ).</li>
              <li>Bật chế độ duyệt riêng tư (Incognito/Private) để hạn chế lưu Cookie ngoài phiên.</li>
              <li>Sử dụng tính năng “Do Not Track” / Global Privacy Control của trình duyệt — Chúng tôi sẽ tôn trọng tín hiệu này ở mức kỹ thuật cho phép.</li>
            </ul>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">8. Trẻ em</h2>
            <p>
              Website không hướng tới trẻ em dưới 16 tuổi. Theo Khoản 1 Điều 20 Nghị định 13/2023/NĐ-CP, dữ liệu trẻ em chỉ được xử lý khi có sự đồng ý của cha, mẹ hoặc người giám hộ. Nếu phát hiện đã thu thập dữ liệu của trẻ em mà chưa có sự đồng ý hợp lệ, Chúng tôi sẽ xoá ngay khi nhận được thông báo.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">9. Liên hệ về Cookie và dữ liệu cá nhân</h2>
            <p>
              Mọi yêu cầu liên quan đến Cookie, quyền của Chủ thể dữ liệu hoặc khiếu nại vui lòng gửi tới:
            </p>
            <CompanyInfoCard />
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Email: <a href="mailto:privacy@marketwatch.vn" className="text-primary underline-offset-4 hover:underline font-medium">privacy@marketwatch.vn</a></li>
              <li>Biểu mẫu: <Link to="/lien-he" className="text-primary underline-offset-4 hover:underline font-medium">trang Liên hệ</Link></li>
            </ul>
            <p>
              Thời gian phản hồi: trong vòng 72 giờ làm việc kể từ khi tiếp nhận yêu cầu hợp lệ, theo quy định tại Điều 14 Nghị định 13/2023/NĐ-CP.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">10. Sửa đổi Chính sách</h2>
            <p>
              Chúng tôi có thể cập nhật Chính sách theo thay đổi về công nghệ, dịch vụ hoặc quy định pháp luật. Phiên bản mới có hiệu lực kể từ ngày đăng tải trên Website. Việc Bạn tiếp tục sử dụng Website sau khi Chính sách được cập nhật được coi là sự chấp thuận đối với phiên bản mới. Đối với thay đổi trọng yếu, Chúng tôi sẽ hiển thị lại banner để xin sự đồng ý lần nữa.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">11. Luật áp dụng và giải quyết tranh chấp</h2>
            <p>
              Chính sách này được điều chỉnh bởi <strong>pháp luật nước Cộng hoà Xã hội Chủ nghĩa Việt Nam</strong>. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết thông qua thương lượng, hoà giải; nếu không đạt kết quả, Toà án Nhân dân có thẩm quyền tại thành phố Đà Nẵng — nơi đặt trụ sở của Công ty TNHH MTV Xuân Diệu Media — sẽ là cơ quan giải quyết cuối cùng.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
