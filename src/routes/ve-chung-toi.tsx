import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageHero } from "@/components/site/PageHero";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/ve-chung-toi`;
const TITLE = "Về MarketWatch Việt Nam — Đội ngũ, sứ mệnh & nguyên tắc dữ liệu";
const DESC = "MarketWatch Việt Nam là công cụ theo dõi dữ liệu tài chính realtime do Công ty TNHH MTV Xuân Diệu Media vận hành. Tìm hiểu sứ mệnh, đội ngũ, quy trình kiểm duyệt dữ liệu và giới hạn trách nhiệm.";

export const Route = createFileRoute("/ve-chung-toi")({
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
          "@type": "AboutPage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
          mainEntity: { "@id": SITE + "/#organization" },
          publisher: { "@id": SITE + "/#organization" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Về chúng tôi", item: URL },
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5">
          <div className="pt-6 md:pt-8"><Breadcrumbs /></div>
          <PageHero
            eyebrow="Về MarketWatch"
            title={<>Theo dõi dữ liệu tài chính <em className="not-italic text-[var(--gold)]">Việt Nam</em> minh bạch & realtime</>}
            description={<>MarketWatch Việt Nam là <strong>công cụ phần mềm</strong> tổng hợp và trực quan hoá dữ liệu thị trường tài chính theo thời gian thực, phục vụ tra cứu phi thương mại — không phải báo điện tử, không sản xuất tin tức.</>}
          />

          <article className="prose dark:prose-invert max-w-none py-8 lg:py-10 space-y-8">
            <section aria-labelledby="who" className="space-y-4">
              <h2 id="who" className="text-2xl font-bold tracking-tight">Ai vận hành MarketWatch?</h2>
              <p className="text-muted-foreground">
                MarketWatch (marketwatch.vn) được vận hành bởi <strong>Công ty TNHH MTV Xuân Diệu Media</strong> — doanh nghiệp đăng ký kinh doanh hợp pháp tại Đà Nẵng (Giấy ĐKKD số 0402222404). Người đại diện và chịu trách nhiệm nội dung: <strong>Ông Nguyễn Xuân Chính</strong>. Liên hệ: <a href="tel:0382663891" className="text-primary hover:underline">0382 663 891</a> · <Link to="/lien-he" className="text-primary hover:underline">/lien-he</Link>.
              </p>
              <p className="text-muted-foreground">
                Trụ sở: 90/12 Hà Huy Tập, phường Thanh Khê, thành phố Đà Nẵng, Việt Nam.
              </p>
            </section>

            <section aria-labelledby="mission" className="space-y-4">
              <h2 id="mission" className="text-2xl font-bold tracking-tight">Sứ mệnh</h2>
              <p className="text-muted-foreground">
                Cung cấp <strong>một điểm tra cứu duy nhất</strong> cho người Việt Nam khi cần theo dõi giá vàng SJC, Bitcoin, tỷ giá USD/EUR/JPY, chứng khoán Việt Nam, lãi suất ngân hàng và giá xăng dầu — với <strong>tốc độ realtime</strong>, <strong>giao diện gọn</strong> và <strong>chú thích nguồn rõ ràng</strong>.
              </p>
              <p className="text-muted-foreground">
                MarketWatch <em>không khuyến nghị đầu tư</em>, <em>không môi giới giao dịch</em>, <em>không nhận uỷ thác tiền</em>. Tất cả số liệu chỉ phục vụ mục đích tham khảo cá nhân.
              </p>
            </section>

            <section aria-labelledby="how" className="space-y-4">
              <h2 id="how" className="text-2xl font-bold tracking-tight">Phương pháp thu thập dữ liệu</h2>
              <p className="text-muted-foreground">
                Mọi chỉ số trên MarketWatch đều được <strong>thu thập tự động</strong> qua API công khai và các nguồn dữ liệu thị trường được công bố rộng rãi. Chi tiết từng nhóm dữ liệu (vàng, crypto, ngoại tệ, lãi suất, xăng dầu, chứng khoán) — <em>lấy từ đâu, tần suất cập nhật, múi giờ, cách quy đổi VND</em> — được liệt kê tại <Link to="/nguon-du-lieu" className="text-primary hover:underline">trang Nguồn dữ liệu &amp; phương pháp tính</Link>.
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Crawler tự động, không có biên tập viên can thiệp vào con số.</li>
                <li>Quy trình kiểm tra: so chiếu chéo nhiều nguồn, đối chiếu với giá liên ngân hàng, cảnh báo khi sai lệch &gt; 2%.</li>
                <li>Mọi sai sót có thể báo cáo trực tiếp qua <Link to="/lien-he" className="text-primary hover:underline">/lien-he</Link> — chúng tôi cam kết xử lý trong vòng 24 giờ.</li>
              </ul>
            </section>

            <section aria-labelledby="review" className="space-y-4">
              <h2 id="review" className="text-2xl font-bold tracking-tight">Kiểm duyệt &amp; trách nhiệm</h2>
              <p className="text-muted-foreground">
                Dữ liệu hiển thị trên MarketWatch được <strong>đội ngũ kỹ thuật của MarketWatch Việt Nam</strong> kiểm duyệt tự động và rà soát thủ công định kỳ. Người chịu trách nhiệm cuối cùng về nội dung số liệu là <strong>Ông Nguyễn Xuân Chính</strong> — đại diện pháp luật của Công ty TNHH MTV Xuân Diệu Media.
              </p>
              <p className="text-muted-foreground">
                MarketWatch <strong>không phải báo điện tử, không phải trang thông tin điện tử tổng hợp, không phải mạng xã hội</strong> theo Nghị định 147/2024/NĐ-CP và Luật Báo chí 2016. Chi tiết giới hạn trách nhiệm xem <Link to="/mien-tru-trach-nhiem" className="text-primary hover:underline">Tuyên bố miễn trừ trách nhiệm</Link>.
              </p>
            </section>

            <section aria-labelledby="brand" className="space-y-4">
              <h2 id="brand" className="text-2xl font-bold tracking-tight">Định danh thương hiệu</h2>
              <p className="text-muted-foreground">
                Tên gọi chính thức: <strong>MarketWatch Việt Nam</strong> (viết tắt: <strong>MarketWatch.vn</strong>). Đây là thương hiệu độc lập của Công ty TNHH MTV Xuân Diệu Media tại Việt Nam và <strong>không liên kết</strong> với MarketWatch.com (thuộc Dow Jones, Hoa Kỳ).
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}