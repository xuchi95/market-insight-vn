import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CompanyInfoCard } from "@/components/site/CompanyInfoCard";
import { PolicyToc } from "@/components/site/PolicyToc";
import { useRef } from "react";

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
  component: PrivacyPage,
});

function PrivacyPage() {
  const contentRef = useRef<HTMLElement>(null);
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

          <PolicyToc contentRef={contentRef} />

          <section ref={contentRef} className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-[15px] leading-7 text-muted-foreground">
            <p>
              MarketWatch (sau đây gọi là “Chúng tôi”, “Website”) cam kết tôn trọng và bảo vệ dữ liệu cá nhân của Người dùng (sau đây gọi là “Bạn”, “Chủ thể dữ liệu”) theo đúng quy định pháp luật Việt Nam, đặc biệt là <strong>Nghị định 13/2023/NĐ-CP ngày 17/4/2023 về bảo vệ dữ liệu cá nhân</strong>, Luật An toàn thông tin mạng 2015, Luật An ninh mạng 2018, Luật Giao dịch điện tử 2023, Luật Bảo vệ quyền lợi người tiêu dùng 2023 và các văn bản pháp luật liên quan. Chính sách này (“Chính sách”) giải thích Chúng tôi thu thập dữ liệu gì, với mục đích nào, xử lý ra sao và Bạn có những quyền gì.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">1. Phạm vi áp dụng</h2>
            <p>
              Chính sách áp dụng cho mọi cá nhân truy cập, sử dụng Website tại tên miền <a href="https://marketwatch.vn" className="text-primary underline-offset-4 hover:underline font-medium">marketwatch.vn</a> và các tên miền phụ liên quan, bao gồm cả khách truy cập không đăng ký và Người dùng đã đăng ký tài khoản. Chính sách KHÔNG áp dụng cho website, dịch vụ của bên thứ ba mà Website có liên kết tới.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">2. Bên Kiểm soát dữ liệu</h2>
            <p>
              Bên Kiểm soát dữ liệu cá nhân (theo Khoản 9 Điều 2 Nghị định 13/2023/NĐ-CP) là <strong>Công ty TNHH MTV Xuân Diệu Media</strong> — đơn vị chủ quản và vận hành Website MarketWatch. Mọi yêu cầu liên quan đến dữ liệu cá nhân vui lòng gửi về địa chỉ liên hệ tại Mục 14.
            </p>
            <CompanyInfoCard />

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">3. Các loại dữ liệu cá nhân Chúng tôi thu thập</h2>
            <p>Tuỳ vào cách Bạn tương tác với Website, Chúng tôi có thể thu thập các nhóm dữ liệu sau:</p>
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-1">3.1. Dữ liệu cá nhân cơ bản</h3>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Họ và tên, địa chỉ email, mật khẩu (đã được băm – hash, Chúng tôi không lưu mật khẩu gốc).</li>
              <li>Số điện thoại (nếu Bạn tự nguyện cung cấp để bật xác thực 2 lớp qua SMS).</li>
              <li>Ảnh đại diện (nếu Bạn cập nhật trong hồ sơ).</li>
              <li>Thông tin Bạn cung cấp khi gửi biểu mẫu liên hệ, phản hồi, đăng ký bản tin.</li>
            </ul>
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-1">3.2. Dữ liệu kỹ thuật và nhật ký</h3>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Địa chỉ IP, định danh thiết bị, loại trình duyệt, hệ điều hành, độ phân giải màn hình, ngôn ngữ.</li>
              <li>Thời điểm truy cập, trang đã xem, hành động trên trang (click, scroll), thời gian phiên.</li>
              <li>URL giới thiệu (referrer), từ khoá tìm kiếm dẫn đến Website.</li>
              <li>Mã định danh phiên (session ID), cookie kỹ thuật, token xác thực.</li>
            </ul>
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-1">3.3. Dữ liệu sử dụng dịch vụ</h3>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Cảnh báo giá Bạn đã thiết lập (tài sản, ngưỡng, kênh nhận thông báo).</li>
              <li>Danh sách theo dõi (watchlist), danh mục đầu tư mô phỏng do Bạn nhập.</li>
              <li>Tuỳ chọn nhận bản tin (chủ đề, tần suất), lịch sử mở email, lịch sử huỷ đăng ký.</li>
              <li>Lịch sử đăng nhập (thời điểm, địa chỉ IP, thiết bị) phục vụ cảnh báo bảo mật.</li>
            </ul>
            <p>
              Chúng tôi <strong>không thu thập dữ liệu nhạy cảm</strong> theo Khoản 4 Điều 2 Nghị định 13/2023/NĐ-CP (như dân tộc, tôn giáo, sức khoẻ, tình trạng hôn nhân, dữ liệu sinh trắc học, tài chính ngân hàng…). Trường hợp đặc biệt cần thu thập, Chúng tôi sẽ xin sự đồng ý rõ ràng bằng văn bản điện tử riêng biệt.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">4. Mục đích xử lý dữ liệu cá nhân</h2>
            <p>Chúng tôi xử lý dữ liệu cá nhân của Bạn cho các mục đích sau và trong phạm vi cần thiết tối thiểu:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Cung cấp dịch vụ:</strong> tạo và quản lý tài khoản, xác thực đăng nhập, cá nhân hoá nội dung, gửi cảnh báo giá, gửi bản tin theo yêu cầu.</li>
              <li><strong>Vận hành kỹ thuật:</strong> duy trì hệ thống, phân bổ tài nguyên, sao lưu, khắc phục sự cố.</li>
              <li><strong>Bảo mật:</strong> phát hiện và ngăn chặn hành vi truy cập trái phép, gian lận, tấn công mạng; cảnh báo đăng nhập từ thiết bị/IP lạ.</li>
              <li><strong>Phân tích:</strong> thống kê ẩn danh số lượng truy cập, hành vi sử dụng để cải thiện trải nghiệm. Dữ liệu phân tích được tổng hợp và không định danh cá nhân.</li>
              <li><strong>Liên lạc:</strong> phản hồi yêu cầu, gửi thông báo quan trọng về thay đổi dịch vụ, chính sách.</li>
              <li><strong>Tuân thủ pháp luật:</strong> đáp ứng yêu cầu hợp pháp của cơ quan nhà nước có thẩm quyền (cơ quan Công an, Toà án, Viện Kiểm sát, cơ quan thuế) theo đúng trình tự pháp luật.</li>
            </ul>
            <p>
              Chúng tôi <strong>không sử dụng dữ liệu cá nhân</strong> để: bán lại cho bên thứ ba vì mục đích thương mại; quảng cáo nhắm mục tiêu hành vi xuyên nền tảng; phân tích thông tin tín dụng cá nhân; cho mục đích khác chưa được Bạn đồng ý.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">5. Căn cứ pháp lý xử lý dữ liệu</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Sự đồng ý của Bạn</strong> (Điều 11 Nghị định 13/2023/NĐ-CP): khi đăng ký tài khoản, đăng ký bản tin, gửi biểu mẫu liên hệ.</li>
              <li><strong>Thực hiện hợp đồng</strong>: xử lý cần thiết để cung cấp dịch vụ Bạn yêu cầu.</li>
              <li><strong>Nghĩa vụ pháp lý</strong>: lưu trữ nhật ký theo Nghị định 53/2022/NĐ-CP; cung cấp dữ liệu cho cơ quan nhà nước theo yêu cầu hợp pháp.</li>
              <li><strong>Lợi ích hợp pháp</strong>: bảo vệ an toàn hệ thống, phòng chống gian lận, cải thiện chất lượng dịch vụ.</li>
            </ul>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">6. Cookie và công nghệ tương tự</h2>
            <p>Website sử dụng các loại cookie sau:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Cookie thiết yếu:</strong> duy trì phiên đăng nhập, ghi nhớ tuỳ chọn cơ bản (chủ đề sáng/tối, đơn vị hiển thị). Không thể tắt vì cần thiết cho hoạt động cơ bản.</li>
              <li><strong>Cookie chức năng:</strong> ghi nhớ tuỳ chỉnh cá nhân hoá (danh sách theo dõi, cấu hình hiển thị).</li>
              <li><strong>Cookie phân tích:</strong> hỗ trợ Chúng tôi đo lường lượng truy cập, hiệu năng. Dữ liệu được ẩn danh.</li>
            </ul>
            <p>
              Bạn có thể xoá hoặc chặn cookie qua cài đặt trình duyệt. Lưu ý: chặn cookie thiết yếu có thể làm một số chức năng (đăng nhập, lưu cảnh báo) không hoạt động. <strong>Website không sử dụng cookie quảng cáo theo dõi xuyên trang web</strong> (third-party advertising cookies).
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">7. Chia sẻ dữ liệu cho bên thứ ba</h2>
            <p>
              Chúng tôi <strong>KHÔNG bán, KHÔNG cho thuê, KHÔNG trao đổi</strong> dữ liệu cá nhân của Bạn cho bên thứ ba vì mục đích thương mại. Dữ liệu chỉ được chia sẻ trong các trường hợp giới hạn sau, dưới ràng buộc hợp đồng bảo mật:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Nhà cung cấp hạ tầng:</strong> dịch vụ máy chủ, cơ sở dữ liệu, CDN, lưu trữ tệp (Lovable Cloud / Supabase, Cloudflare). Các nhà cung cấp này chỉ xử lý dữ liệu theo chỉ dẫn của Chúng tôi.</li>
              <li><strong>Dịch vụ gửi email:</strong> Postmark – để gửi email xác nhận, OTP, cảnh báo giá, bản tin theo yêu cầu của Bạn.</li>
              <li><strong>Dịch vụ xác thực:</strong> Google (đăng nhập bằng Google), Authsignal (xác thực 2 lớp) – chỉ chia sẻ dữ liệu tối thiểu cần thiết để xác thực.</li>
              <li><strong>Cơ quan nhà nước:</strong> khi có yêu cầu hợp pháp bằng văn bản từ cơ quan có thẩm quyền (Công an, Toà án, Viện Kiểm sát, Thanh tra…) theo đúng trình tự pháp luật.</li>
              <li><strong>Bảo vệ quyền lợi:</strong> khi cần thiết để bảo vệ quyền, tài sản, an toàn của MarketWatch, Người dùng hoặc cộng đồng.</li>
            </ul>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">8. Chuyển dữ liệu ra nước ngoài</h2>
            <p>
              Một số nhà cung cấp dịch vụ hạ tầng của Chúng tôi (như Cloudflare, Postmark, Google) có thể lưu trữ, xử lý dữ liệu tại các máy chủ đặt ngoài lãnh thổ Việt Nam. Việc chuyển dữ liệu cá nhân của công dân Việt Nam ra nước ngoài được thực hiện theo Điều 25 Nghị định 13/2023/NĐ-CP, bao gồm: (i) lập Hồ sơ đánh giá tác động chuyển dữ liệu cá nhân ra nước ngoài; (ii) bảo đảm đối tác nước ngoài có biện pháp bảo vệ tương đương; (iii) sẵn sàng cung cấp hồ sơ cho Bộ Công an khi có yêu cầu. Bằng việc sử dụng Website, Bạn đồng ý với việc chuyển dữ liệu này trong phạm vi nêu trên.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">9. Thời gian lưu trữ dữ liệu</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Tài khoản người dùng:</strong> lưu trữ trong suốt thời gian tài khoản còn hoạt động và 24 tháng sau khi tài khoản bị xoá để xử lý các nghĩa vụ pháp lý (nếu có).</li>
              <li><strong>Nhật ký truy cập, đăng nhập:</strong> tối thiểu 24 tháng theo Khoản 3 Điều 26 Luật An ninh mạng 2018 và Điều 27 Nghị định 53/2022/NĐ-CP.</li>
              <li><strong>Email đăng ký bản tin:</strong> đến khi Bạn huỷ đăng ký. Sau đó, email được chuyển sang danh sách suppression để tránh gửi nhầm.</li>
              <li><strong>Cookie:</strong> theo thời hạn quy định tại trình duyệt, tối đa 12 tháng.</li>
              <li><strong>Yêu cầu liên hệ:</strong> lưu trữ 24 tháng kể từ ngày phản hồi xong.</li>
            </ul>
            <p>Sau thời hạn lưu trữ, dữ liệu sẽ được xoá hoặc ẩn danh hoá theo quy trình kỹ thuật.</p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">10. Biện pháp bảo mật</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Mã hoá toàn bộ kết nối qua HTTPS/TLS 1.2 trở lên.</li>
              <li>Mật khẩu được băm bằng thuật toán an toàn (bcrypt/argon2), Chúng tôi không thể đọc được mật khẩu gốc của Bạn.</li>
              <li>Áp dụng kiểm soát truy cập theo vai trò (RLS) ở tầng cơ sở dữ liệu.</li>
              <li>Hỗ trợ xác thực 2 lớp (TOTP, SMS) cho tài khoản người dùng.</li>
              <li>Giám sát, ghi log truy cập; cảnh báo khi phát hiện đăng nhập bất thường.</li>
              <li>Đào tạo nhân sự nội bộ về bảo mật dữ liệu, ký cam kết bảo mật.</li>
              <li>Đánh giá định kỳ rủi ro an toàn thông tin; vá lỗ hổng kịp thời.</li>
            </ul>
            <p>
              Tuy đã áp dụng các biện pháp hợp lý, không hệ thống nào tuyệt đối an toàn. Bạn có trách nhiệm bảo vệ thông tin đăng nhập, không chia sẻ mật khẩu, sử dụng mật khẩu mạnh và bật xác thực 2 lớp.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">11. Quyền của Chủ thể dữ liệu</h2>
            <p>Theo Điều 9 Nghị định 13/2023/NĐ-CP, Bạn có các quyền sau đối với dữ liệu cá nhân của mình:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li><strong>Quyền được biết:</strong> được thông báo về hoạt động xử lý dữ liệu cá nhân.</li>
              <li><strong>Quyền đồng ý / rút lại sự đồng ý:</strong> đồng ý hoặc không đồng ý với việc xử lý; rút lại sự đồng ý bất kỳ lúc nào.</li>
              <li><strong>Quyền truy cập:</strong> xem, yêu cầu cung cấp bản sao dữ liệu cá nhân của mình.</li>
              <li><strong>Quyền chỉnh sửa:</strong> yêu cầu sửa đổi dữ liệu không chính xác, không đầy đủ.</li>
              <li><strong>Quyền xoá:</strong> yêu cầu xoá dữ liệu khi không còn cần thiết hoặc rút lại sự đồng ý.</li>
              <li><strong>Quyền hạn chế xử lý:</strong> yêu cầu tạm ngừng xử lý trong các trường hợp luật định.</li>
              <li><strong>Quyền phản đối xử lý:</strong> phản đối việc xử lý nhằm ngăn chặn thiệt hại.</li>
              <li><strong>Quyền yêu cầu cung cấp dữ liệu:</strong> yêu cầu cung cấp dữ liệu ở định dạng có thể đọc được bằng máy.</li>
              <li><strong>Quyền khiếu nại, tố cáo, khởi kiện:</strong> theo quy định pháp luật.</li>
              <li><strong>Quyền yêu cầu bồi thường thiệt hại:</strong> khi có vi phạm trong xử lý dữ liệu cá nhân.</li>
              <li><strong>Quyền tự bảo vệ:</strong> tự thực hiện hoặc yêu cầu cơ quan có thẩm quyền bảo vệ quyền của mình.</li>
            </ul>
            <p>
              Để thực hiện các quyền trên, vui lòng gửi yêu cầu về email tại Mục 13. Chúng tôi sẽ phản hồi trong vòng 72 giờ làm việc và xử lý hoàn tất trong vòng 30 ngày kể từ ngày nhận yêu cầu hợp lệ, phù hợp Khoản 5 Điều 14 Nghị định 13/2023/NĐ-CP. Trong trường hợp phức tạp, thời hạn có thể được gia hạn thêm tối đa 02 tháng và Chúng tôi sẽ thông báo bằng văn bản.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">12. Bảo vệ dữ liệu cá nhân của trẻ em</h2>
            <p>
              Website không hướng tới và không cố ý thu thập dữ liệu cá nhân của trẻ em dưới 16 tuổi mà không có sự đồng ý của cha mẹ hoặc người giám hộ hợp pháp (Điều 20 Nghị định 13/2023/NĐ-CP). Nếu phát hiện đã thu thập dữ liệu của trẻ em không có sự đồng ý hợp lệ, Chúng tôi sẽ xoá ngay lập tức.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">13. Thông báo vi phạm dữ liệu</h2>
            <p>
              Trong trường hợp xảy ra sự cố vi phạm dữ liệu cá nhân, Chúng tôi sẽ: (i) thông báo cho Bộ Công an (Cục An ninh mạng và Phòng, chống tội phạm sử dụng công nghệ cao – A05) trong vòng 72 giờ kể từ khi phát hiện, theo Điều 23 Nghị định 13/2023/NĐ-CP; (ii) thông báo cho Chủ thể dữ liệu bị ảnh hưởng qua email/thông báo trong sản phẩm; (iii) áp dụng biện pháp khắc phục, hạn chế thiệt hại.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">14. Thông tin liên hệ về bảo vệ dữ liệu</h2>
            <p>Mọi câu hỏi, yêu cầu, khiếu nại liên quan đến dữ liệu cá nhân vui lòng gửi về:</p>
            <CompanyInfoCard title="Đầu mối tiếp nhận yêu cầu" />
            <ul className="list-disc pl-6 space-y-2 marker:text-primary/60">
              <li>Email: <a href="mailto:contact@marketwatch.vn" className="text-primary underline-offset-4 hover:underline font-medium">contact@marketwatch.vn</a></li>
              <li>Trang liên hệ: <Link to="/lien-he" className="text-primary underline-offset-4 hover:underline font-medium">marketwatch.vn/lien-he</Link></li>
              <li>Quản lý bản tin / huỷ nhận email: <Link to="/cai-dat/ban-tin" className="text-primary underline-offset-4 hover:underline font-medium">marketwatch.vn/cai-dat/ban-tin</Link> hoặc liên kết “Huỷ đăng ký” trong từng email.</li>
            </ul>
            <p>
              Bạn cũng có quyền khiếu nại trực tiếp đến <strong>Cục An ninh mạng và Phòng, chống tội phạm sử dụng công nghệ cao – Bộ Công an</strong> hoặc cơ quan nhà nước có thẩm quyền khác nếu cho rằng quyền của mình bị xâm phạm.
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-2 scroll-mt-24">15. Thay đổi Chính sách</h2>
            <p>
              Chính sách có thể được cập nhật để phù hợp với thay đổi của pháp luật hoặc thực tiễn vận hành. Phiên bản mới nhất luôn được đăng tại trang này kèm ngày cập nhật. Với thay đổi quan trọng ảnh hưởng đến quyền cơ bản của Bạn, Chúng tôi sẽ thông báo qua email hoặc thông báo nổi bật trên Website ít nhất 7 ngày trước khi áp dụng và, khi pháp luật yêu cầu, xin lại sự đồng ý của Bạn.
            </p>

            <p className="text-xs italic pt-4 border-t border-border">
              Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}. Bằng việc tiếp tục sử dụng MarketWatch, Bạn xác nhận đã đọc và đồng ý với Chính sách này.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}