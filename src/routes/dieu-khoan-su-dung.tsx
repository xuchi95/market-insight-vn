import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CompanyInfoCard } from "@/components/site/CompanyInfoCard";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/dieu-khoan-su-dung`;
const TITLE = "Điều khoản sử dụng — MarketWatch";
const DESC = "Điều khoản sử dụng website MarketWatch. Quy định về quyền và nghĩa vụ của người dùng khi truy cập thông tin giá vàng, crypto, ngoại tệ.";

export const Route = createFileRoute("/dieu-khoan-su-dung")({
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
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <Breadcrumbs />
          <header>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Điều khoản sử dụng</h1>
            <p className="mt-2 text-sm text-muted-foreground">Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}</p>
          </header>

          <section className="prose dark:prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Điều khoản sử dụng này (sau đây gọi là “Điều khoản”) là thỏa thuận pháp lý có hiệu lực giữa <strong>người sử dụng</strong> (sau đây gọi là “Người dùng”, “Bạn”) và <strong>MarketWatch</strong> (sau đây gọi là “Website”, “Chúng tôi”) khi truy cập, sử dụng các nội dung, công cụ, dữ liệu, dịch vụ được cung cấp tại tên miền <a href="https://marketwatch.vn" className="text-foreground underline">marketwatch.vn</a> và các tên miền phụ liên quan. Điều khoản được xây dựng tuân thủ pháp luật Việt Nam hiện hành, bao gồm nhưng không giới hạn: Bộ luật Dân sự 2015, Luật Giao dịch điện tử 2023, Luật An ninh mạng 2018, Luật An toàn thông tin mạng 2015, Luật Bảo vệ quyền lợi người tiêu dùng 2023, Luật Sở hữu trí tuệ (sửa đổi 2022), Luật Quảng cáo, Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, Nghị định 147/2024/NĐ-CP về quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng (thay thế Nghị định 72/2013/NĐ-CP và Nghị định 27/2018/NĐ-CP), Nghị định 53/2022/NĐ-CP quy định chi tiết Luật An ninh mạng, Nghị định 80/2016/NĐ-CP về thanh toán không dùng tiền mặt, Nghị định 24/2012/NĐ-CP về quản lý hoạt động kinh doanh vàng, Pháp lệnh Ngoại hối 2005 (sửa đổi 2013), Luật Các tổ chức tín dụng 2024, Luật Chứng khoán 2019, Luật Quản lý thuế 2019 và các văn bản hướng dẫn liên quan.
            </p>

            <h2 className="text-xl font-semibold text-foreground">1. Định nghĩa và giải thích thuật ngữ</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Website:</strong> Tổng thể giao diện, mã nguồn, cơ sở dữ liệu, nội dung và dịch vụ được vận hành tại marketwatch.vn.</li>
              <li><strong>Người dùng:</strong> Cá nhân, tổ chức truy cập, sử dụng Website, không phân biệt đã đăng ký tài khoản hay chưa.</li>
              <li><strong>Nội dung:</strong> Văn bản, hình ảnh, biểu đồ, dữ liệu giá, bản tin, video, phần mềm, mã nguồn, giao diện và bất kỳ dữ liệu nào hiển thị trên Website.</li>
              <li><strong>Dữ liệu thị trường:</strong> Giá vàng, tỷ giá ngoại tệ, lãi suất, giá tài sản mã hoá, chỉ số chứng khoán, giá nhiên liệu và các dữ liệu tài chính khác được tổng hợp từ nguồn công khai của bên thứ ba.</li>
              <li><strong>Tài sản mã hoá:</strong> Theo cách hiểu tại Việt Nam, là dạng tài sản số dựa trên công nghệ chuỗi khối (blockchain) — không phải tiền tệ, không phải phương tiện thanh toán hợp pháp.</li>
              <li><strong>Bên thứ ba:</strong> Nhà cung cấp dữ liệu, đối tác kỹ thuật, dịch vụ thanh toán, dịch vụ email, máy chủ, CDN, dịch vụ phân tích và các nhà cung cấp dịch vụ độc lập khác.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">2. Chấp nhận điều khoản</h2>
            <p>
              Khi truy cập, đăng ký tài khoản, đăng ký bản tin, sử dụng bất kỳ chức năng nào của Website, Bạn xác nhận: (i) đã đủ năng lực hành vi dân sự theo Bộ luật Dân sự 2015 (đủ 18 tuổi hoặc có người đại diện hợp pháp đối với người chưa thành niên); (ii) đã đọc, hiểu và đồng ý đầy đủ Điều khoản này cùng <Link to="/chinh-sach-bao-mat" className="text-foreground underline">Chính sách dữ liệu & quyền riêng tư</Link> và <Link to="/mien-tru-trach-nhiem" className="text-foreground underline">Tuyên bố miễn trừ trách nhiệm</Link>; (iii) cam kết tuân thủ pháp luật Việt Nam và pháp luật nơi Bạn cư trú khi sử dụng Website. Nếu không đồng ý bất kỳ điều khoản nào, vui lòng ngừng truy cập ngay lập tức.
            </p>

            <h2 className="text-xl font-semibold text-foreground">3. Bản chất và mục đích của Website</h2>
            <p>
              MarketWatch là <strong>công cụ phần mềm phân tích và trực quan hoá số liệu thị trường tài chính theo thời gian thực</strong> (giá vàng, tỷ giá ngoại tệ, lãi suất, giá tài sản mã hoá, chỉ số chứng khoán, giá nhiên liệu) được truy xuất tự động qua API công khai của bên thứ ba, phục vụ mục đích tra cứu, tham khảo phi thương mại. Website hoạt động tương tự một bảng giá điện tử / máy tính tài chính và <strong>KHÔNG</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cung cấp dịch vụ môi giới, tư vấn đầu tư, quản lý danh mục, ủy thác đầu tư theo Luật Chứng khoán 2019.</li>
              <li>Cung cấp dịch vụ ví điện tử, trung gian thanh toán, sàn giao dịch tài sản mã hoá hoặc bất kỳ dịch vụ tài chính nào yêu cầu giấy phép của Ngân hàng Nhà nước, Ủy ban Chứng khoán Nhà nước hoặc cơ quan nhà nước có thẩm quyền khác.</li>
              <li>Tổ chức mua bán vàng miếng, ngoại tệ; không phải tổ chức tín dụng theo Luật Các tổ chức tín dụng 2024.</li>
              <li>Cung cấp dịch vụ thông tin tín dụng theo Nghị định 58/2021/NĐ-CP.</li>
              <li>Phát hành báo chí, không thuộc đối tượng điều chỉnh của Luật Báo chí 2016.</li>
              <li><strong>Không phải trang thông tin điện tử tổng hợp</strong> theo Điều 25, Điều 30 Nghị định 147/2024/NĐ-CP: Website chỉ hiển thị số liệu thị trường truy xuất tự động qua API, không sao chép, không biên tập lại tin tức, bài viết của cơ quan báo chí hay nguồn thông tin chính thức khác.</li>
              <li><strong>Không phải mạng xã hội</strong> theo Điều 26 Nghị định 147/2024/NĐ-CP: Website không có chức năng cho phép Người dùng tạo trang/hồ sơ cá nhân công khai, đăng tải, chia sẻ, bình luận hoặc tương tác nội dung công khai với người dùng khác. Tài khoản (nếu có) chỉ phục vụ cá nhân hoá cảnh báo giá, danh mục theo dõi và nhận bản tin email riêng tư.</li>
              <li><strong>Không phải trang thông tin điện tử cung cấp dịch vụ chuyên ngành</strong> thuộc các lĩnh vực kinh doanh có điều kiện: Website không cung cấp dịch vụ tài chính, ngân hàng, chứng khoán, viễn thông, y tế, giáo dục… cần giấy phép chuyên ngành.</li>
            </ul>
            <p>
              Website là <strong>ứng dụng/công cụ phần mềm hiển thị số liệu</strong> hoạt động trong phạm vi dữ liệu thị trường tài chính công khai và chỉ phục vụ nhu cầu tra cứu, phân tích cá nhân của Người dùng, do đó <strong>không thuộc diện phải xin Giấy phép thiết lập trang thông tin điện tử tổng hợp, giấy phép mạng xã hội, giấy phép báo chí</strong> hoặc các giấy phép kinh doanh có điều kiện liên quan. Trường hợp cơ quan nhà nước có thẩm quyền yêu cầu phân loại lại hoặc bổ sung thủ tục cấp phép, Chúng tôi sẽ thực hiện đầy đủ theo quy định.
            </p>

            <h2 className="text-xl font-semibold text-foreground">4. Tài khoản người dùng</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Bạn có thể sử dụng Website mà không cần tài khoản. Việc đăng ký tài khoản là tự nguyện, nhằm sử dụng các chức năng cá nhân hoá (cảnh báo giá, danh mục theo dõi, bản tin email).</li>
              <li>Bạn cam kết cung cấp thông tin chính xác, đầy đủ và cập nhật khi thay đổi. Bạn chịu trách nhiệm toàn bộ về bảo mật mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình.</li>
              <li>Một người chỉ được đăng ký một tài khoản, trừ khi có sự chấp thuận bằng văn bản của Chúng tôi. Nghiêm cấm tạo tài khoản giả mạo, sử dụng danh tính người khác hoặc thông tin sai sự thật.</li>
              <li>Chúng tôi có quyền tạm khoá, xoá tài khoản nếu phát hiện hành vi vi phạm Điều khoản, vi phạm pháp luật hoặc theo yêu cầu của cơ quan nhà nước có thẩm quyền, mà không cần báo trước.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">5. Quy tắc ứng xử và các hành vi bị nghiêm cấm</h2>
            <p>Người dùng cam kết KHÔNG thực hiện các hành vi sau (căn cứ Điều 8, Điều 16, Điều 17, Điều 18 Luật An ninh mạng 2018; Điều 8 Nghị định 147/2024/NĐ-CP; Điều 101 Nghị định 15/2020/NĐ-CP):</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sử dụng Website để soạn thảo, đăng tải, phát tán thông tin có nội dung chống Nhà nước Cộng hoà Xã hội Chủ nghĩa Việt Nam; xuyên tạc lịch sử, phủ nhận thành tựu cách mạng; phá hoại khối đại đoàn kết toàn dân tộc; xúc phạm tôn giáo, phân biệt đối xử về giới, chủng tộc.</li>
              <li>Đăng tải thông tin sai sự thật gây hoang mang trong nhân dân, gây thiệt hại cho hoạt động kinh tế – xã hội, gây khó khăn cho hoạt động của cơ quan nhà nước hoặc người thi hành công vụ.</li>
              <li>Sử dụng Website để hoạt động mại dâm, tệ nạn xã hội, mua bán người; đăng tải thông tin dâm ô, đồi truỵ, tội ác; phá hoại thuần phong, mỹ tục của dân tộc.</li>
              <li>Tổ chức, hoạt động, cấu kết, xúi giục, mua chuộc, lừa gạt, lôi kéo, đào tạo người chống Nhà nước.</li>
              <li>Sử dụng dữ liệu trên Website để: (i) tổ chức huy động vốn trái phép; (ii) vận hành sàn giao dịch tài sản mã hoá, sàn ngoại hối (forex), sàn vàng tài khoản, quyền chọn nhị phân (binary option) chưa được cấp phép tại Việt Nam; (iii) kinh doanh đa cấp tài chính; (iv) lừa đảo chiếm đoạt tài sản dưới mọi hình thức.</li>
              <li>Sử dụng Website làm phương tiện thanh toán hoặc môi giới sử dụng tài sản mã hoá làm phương tiện thanh toán — hành vi bị cấm theo Khoản 6, 7 Điều 1 Nghị định 80/2016/NĐ-CP và Công văn 5747/NHNN-PC năm 2017.</li>
              <li>Tự động thu thập, sao chép, nhân bản dữ liệu (crawling, scraping) ở quy mô gây quá tải hệ thống; sử dụng bot, script tự động không có sự cho phép bằng văn bản.</li>
              <li>Tấn công mạng, phát tán mã độc, virus, mã khai thác lỗ hổng; thực hiện tấn công từ chối dịch vụ (DDoS); dò quét lỗ hổng bảo mật trái phép; chiếm đoạt tài khoản người khác.</li>
              <li>Can thiệp, vô hiệu hoá các biện pháp kỹ thuật bảo vệ bản quyền, kiểm soát truy cập của Website.</li>
              <li>Sao chép, sửa đổi, phân phối, công bố, kinh doanh thương mại bất kỳ phần nội dung nào của Website khi chưa có văn bản đồng ý của MarketWatch.</li>
              <li>Mạo danh MarketWatch, sử dụng tên thương hiệu, logo, giao diện gây nhầm lẫn cho người tiêu dùng.</li>
              <li>Sử dụng Website để gửi thư rác (spam), quảng cáo trái phép, lừa đảo phishing.</li>
            </ul>
            <p>
              Người dùng vi phạm các quy định trên có thể bị xử phạt hành chính theo Nghị định 15/2020/NĐ-CP (sửa đổi bởi Nghị định 14/2022/NĐ-CP), truy cứu trách nhiệm hình sự theo Bộ luật Hình sự 2015 (sửa đổi 2017) và phải bồi thường thiệt hại theo quy định pháp luật dân sự. MarketWatch có quyền và nghĩa vụ phối hợp với cơ quan nhà nước có thẩm quyền để xử lý.
            </p>

            <h2 className="text-xl font-semibold text-foreground">6. Quyền sở hữu trí tuệ</h2>
            <p>
              Toàn bộ giao diện, mã nguồn, văn bản biên tập, biểu đồ, hình ảnh, biểu trưng (logo), tên thương hiệu “MarketWatch” và các tài sản trí tuệ khác trên Website thuộc quyền sở hữu hợp pháp của MarketWatch và/hoặc bên cấp phép, được bảo hộ theo Luật Sở hữu trí tuệ Việt Nam (sửa đổi 2022) và các điều ước quốc tế mà Việt Nam là thành viên (Công ước Berne, Hiệp định TRIPS).
            </p>
            <p>
              Dữ liệu giá vàng, tiền mã hoá, ngoại tệ, lãi suất được tổng hợp từ nguồn công khai của bên thứ ba (SJC, PNJ, DOJI, các ngân hàng thương mại, CoinGecko, các API thị trường…) và thuộc quyền của chủ sở hữu tương ứng. MarketWatch chỉ thực hiện việc tổng hợp, hiển thị nhằm mục đích tham khảo theo nguyên tắc “fair use”.
            </p>
            <p>
              Người dùng được phép xem, tải về cho mục đích cá nhân, phi thương mại. Mọi hành vi sao chép, trích dẫn, đăng tải lại trên các nền tảng khác phải ghi rõ nguồn “MarketWatch – marketwatch.vn” kèm liên kết về bài viết gốc. Sử dụng cho mục đích thương mại phải có sự chấp thuận bằng văn bản.
            </p>

            <h2 className="text-xl font-semibold text-foreground">7. Nội dung do người dùng cung cấp</h2>
            <p>
              Khi Bạn gửi phản hồi, bình luận, câu hỏi, ý kiến qua biểu mẫu liên hệ hoặc các kênh khác, Bạn đồng ý cấp cho MarketWatch quyền sử dụng, lưu trữ, hiển thị, sửa đổi (nhằm phù hợp với khuôn khổ pháp luật và thuần phong mỹ tục) các nội dung đó miễn phí, không độc quyền, trên phạm vi toàn cầu. Bạn cam kết nội dung gửi đi không xâm phạm quyền của bên thứ ba và chịu trách nhiệm pháp lý về nội dung đó.
            </p>

            <h2 className="text-xl font-semibold text-foreground">8. Liên kết đến bên thứ ba</h2>
            <p>
              Website có thể chứa liên kết đến website, dịch vụ của bên thứ ba (sàn giao dịch, ngân hàng, nguồn tin tức…). MarketWatch không kiểm soát và không chịu trách nhiệm về nội dung, chính sách bảo mật, hoạt động của các bên thứ ba này. Việc Bạn truy cập, sử dụng dịch vụ của bên thứ ba thuộc trách nhiệm và rủi ro của riêng Bạn.
            </p>

            <h2 className="text-xl font-semibold text-foreground">9. Dịch vụ miễn phí và quyền thay đổi</h2>
            <p>
              Hầu hết dịch vụ trên Website được cung cấp <strong>miễn phí</strong>. MarketWatch có quyền: (i) bổ sung, sửa đổi, tạm ngừng hoặc chấm dứt bất kỳ chức năng nào mà không cần báo trước; (ii) giới hạn truy cập, áp dụng hạn mức (rate limit), yêu cầu đăng ký tài khoản đối với một số chức năng; (iii) thu phí đối với các dịch vụ cao cấp trong tương lai, với điều kiện thông báo rõ ràng và có sự đồng ý của Người dùng trước khi phát sinh nghĩa vụ thanh toán.
            </p>

            <h2 className="text-xl font-semibold text-foreground">10. Tuyên bố từ chối bảo đảm và giới hạn trách nhiệm</h2>
            <p>
              Website được cung cấp “nguyên trạng” (as is) và “theo khả năng sẵn có” (as available). Trong phạm vi tối đa pháp luật cho phép, MarketWatch <strong>không bảo đảm</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tính chính xác tuyệt đối, kịp thời, đầy đủ của dữ liệu thị trường (giá vàng, crypto, ngoại tệ, lãi suất…).</li>
              <li>Website hoạt động liên tục, không gián đoạn, không lỗi, không bị tấn công.</li>
              <li>Kết quả tài chính của Người dùng khi đưa ra quyết định dựa trên thông tin từ Website.</li>
            </ul>
            <p>
              MarketWatch <strong>không chịu trách nhiệm</strong> với bất kỳ thiệt hại trực tiếp, gián tiếp, ngẫu nhiên, hệ quả nào (mất lợi nhuận, mất dữ liệu, mất cơ hội, tổn thất uy tín…) phát sinh từ: (i) việc sử dụng hoặc không thể sử dụng Website; (ii) sai sót, chậm trễ, gián đoạn của dữ liệu; (iii) hành vi của bên thứ ba; (iv) các quyết định đầu tư, giao dịch của Người dùng. Chi tiết tại <Link to="/mien-tru-trach-nhiem" className="text-foreground underline">Tuyên bố miễn trừ trách nhiệm</Link>.
            </p>

            <h2 className="text-xl font-semibold text-foreground">11. Bồi hoàn</h2>
            <p>
              Người dùng đồng ý bồi hoàn, bảo vệ MarketWatch và các bên liên quan (nhân sự, đối tác, nhà cung cấp) khỏi mọi khiếu nại, yêu cầu, tổn thất, chi phí (bao gồm phí luật sư hợp lý) phát sinh từ việc Người dùng: (i) vi phạm Điều khoản này; (ii) vi phạm pháp luật; (iii) xâm phạm quyền của bên thứ ba khi sử dụng Website.
            </p>

            <h2 className="text-xl font-semibold text-foreground">12. Bất khả kháng</h2>
            <p>
              MarketWatch không phải chịu trách nhiệm về việc chậm trễ hoặc không thực hiện được nghĩa vụ trong các trường hợp bất khả kháng theo Điều 156 Bộ luật Dân sự 2015, bao gồm nhưng không giới hạn: thiên tai, dịch bệnh, chiến tranh, đình công, sự cố hạ tầng Internet/điện lực diện rộng, tấn công mạng quy mô lớn, thay đổi pháp luật buộc dừng dịch vụ, lệnh của cơ quan nhà nước có thẩm quyền.
            </p>

            <h2 className="text-xl font-semibold text-foreground">13. Bảo vệ dữ liệu cá nhân</h2>
            <p>
              Việc thu thập, xử lý, lưu trữ, chuyển giao dữ liệu cá nhân của Người dùng được thực hiện theo <Link to="/chinh-sach-bao-mat" className="text-foreground underline">Chính sách dữ liệu & quyền riêng tư</Link>, tuân thủ đầy đủ Nghị định 13/2023/NĐ-CP. Bằng việc sử dụng Website, Người dùng đồng ý với việc xử lý dữ liệu cá nhân theo chính sách nêu trên.
            </p>

            <h2 className="text-xl font-semibold text-foreground">14. Chấm dứt sử dụng</h2>
            <p>
              Người dùng có quyền chấm dứt sử dụng Website bất kỳ lúc nào bằng cách ngừng truy cập hoặc xoá tài khoản tại trang Cài đặt. MarketWatch có quyền đơn phương chấm dứt, hạn chế quyền truy cập của Người dùng nếu phát hiện vi phạm Điều khoản hoặc theo yêu cầu của cơ quan nhà nước. Việc chấm dứt không làm phát sinh nghĩa vụ bồi thường của MarketWatch đối với Người dùng.
            </p>

            <h2 className="text-xl font-semibold text-foreground">15. Sửa đổi Điều khoản</h2>
            <p>
              MarketWatch có quyền sửa đổi, bổ sung Điều khoản này bất kỳ lúc nào để phù hợp với thay đổi pháp luật hoặc thực tiễn vận hành. Phiên bản mới sẽ được đăng tải tại trang này kèm ngày cập nhật. Đối với thay đổi quan trọng ảnh hưởng đến quyền và nghĩa vụ cơ bản, MarketWatch sẽ thông báo qua email (đối với người dùng đã đăng ký) hoặc thông báo nổi bật trên Website ít nhất 7 ngày trước khi áp dụng. Việc Bạn tiếp tục sử dụng Website sau ngày hiệu lực đồng nghĩa với việc chấp thuận thay đổi.
            </p>

            <h2 className="text-xl font-semibold text-foreground">16. Giải quyết tranh chấp</h2>
            <p>
              Mọi tranh chấp phát sinh từ hoặc liên quan đến Điều khoản này trước hết sẽ được giải quyết thông qua thương lượng, hoà giải thiện chí trong vòng 30 ngày kể từ ngày một bên thông báo cho bên kia bằng văn bản. Nếu không đạt được thoả thuận, tranh chấp sẽ được đưa ra <strong>Toà án nhân dân có thẩm quyền tại Việt Nam</strong> giải quyết theo quy định của pháp luật tố tụng dân sự Việt Nam.
            </p>

            <h2 className="text-xl font-semibold text-foreground">17. Luật áp dụng và hiệu lực từng phần</h2>
            <p>
              Điều khoản này được điều chỉnh và giải thích theo pháp luật nước Cộng hoà Xã hội Chủ nghĩa Việt Nam, không áp dụng quy tắc xung đột luật. Nếu bất kỳ điều khoản nào bị Toà án hoặc cơ quan có thẩm quyền tuyên vô hiệu, các điều khoản còn lại vẫn giữ nguyên hiệu lực thi hành.
            </p>

            <h2 className="text-xl font-semibold text-foreground">18. Thông tin liên hệ</h2>
            <p>
              Mọi thắc mắc, phản ánh, khiếu nại, yêu cầu liên quan đến Điều khoản hoặc hoạt động của Website, vui lòng gửi về:
            </p>
            <CompanyInfoCard />
            <ul className="list-disc pl-6 space-y-2">
              <li>Email: <a href="mailto:contact@marketwatch.vn" className="text-foreground underline">contact@marketwatch.vn</a></li>
              <li>Trang liên hệ: <Link to="/lien-he" className="text-foreground underline">marketwatch.vn/lien-he</Link></li>
            </ul>
            <p>
              Chúng tôi cam kết phản hồi trong thời hạn tối đa 15 ngày làm việc kể từ ngày nhận được yêu cầu hợp lệ.
            </p>

            <p className="text-xs italic pt-4 border-t border-border">
              Điều khoản này có hiệu lực kể từ ngày đăng tải. Bằng việc tiếp tục sử dụng MarketWatch, Bạn xác nhận đã đọc, hiểu và đồng ý với toàn bộ nội dung trên.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}