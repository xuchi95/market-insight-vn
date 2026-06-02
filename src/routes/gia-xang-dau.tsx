import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Ticker } from "@/components/site/Ticker";
import { OilPriceTable } from "@/components/site/OilPriceTable";
import { VnFuelPriceTable } from "@/components/site/VnFuelPriceTable";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/gia-xang-dau`;
const TITLE = "Giá xăng dầu hôm nay — Petrolimex, Brent & WTI | MarketWatch";
const DESC = "Giá xăng dầu hôm nay cập nhật mới nhất: bảng giá Petrolimex (RON 95-V, E5 RON 92, Diesel, Dầu hỏa) theo kỳ điều hành và giá dầu thô Brent, WTI thế giới realtime theo USD/thùng.";

const FAQ = [
  {
    q: "Giá xăng dầu hôm nay là bao nhiêu?",
    a: "Giá xăng dầu hôm nay được cập nhật theo kỳ điều hành 7 ngày/lần của Liên Bộ Công Thương — Tài chính, áp dụng cho hệ thống Petrolimex trên cả nước. Xem bảng giá chi tiết RON 95-V, E5 RON 92, Diesel và Dầu hỏa ngay phía trên.",
  },
  {
    q: "Giá xăng được điều chỉnh khi nào?",
    a: "Theo Nghị định 80/2023/NĐ-CP, giá xăng dầu trong nước được điều chỉnh định kỳ vào thứ Năm hàng tuần (kỳ điều hành 7 ngày). Trường hợp trùng ngày nghỉ lễ sẽ được lùi sang ngày làm việc tiếp theo.",
  },
  {
    q: "Giá dầu Brent và WTI khác nhau thế nào?",
    a: "Brent là dầu thô khai thác ở Biển Bắc, giao dịch trên sàn ICE — là chuẩn tham chiếu cho hơn 60% nguồn cung dầu toàn cầu. WTI (West Texas Intermediate) khai thác tại Mỹ, giao dịch trên NYMEX, thường có giá thấp hơn Brent vài USD/thùng.",
  },
  {
    q: "Giá xăng dầu thế giới ảnh hưởng thế nào tới Việt Nam?",
    a: "Giá bán lẻ xăng dầu trong nước được tính dựa trên giá thành phẩm bình quân 7 ngày trên thị trường Singapore (Platts), cộng thuế, phí, lợi nhuận định mức và trích/chi Quỹ bình ổn. Khi giá dầu thế giới tăng/giảm mạnh, giá xăng trong nước sẽ phản ánh ở kỳ điều hành kế tiếp.",
  },
];

export const Route = createFileRoute("/gia-xang-dau")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "giá xăng dầu hôm nay, giá xăng hôm nay, giá xăng dầu, giá xăng Petrolimex, giá dầu Brent, giá dầu WTI, RON 95, E5 RON 92, Diesel, giá xăng dầu thế giới",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
      { property: "og:site_name", content: "MarketWatch" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": URL,
              url: URL,
              name: TITLE,
              description: DESC,
              inLanguage: "vi-VN",
              isPartOf: { "@type": "WebSite", url: SITE, name: "MarketWatch" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE },
                { "@type": "ListItem", position: 2, name: "Giá xăng dầu hôm nay", item: URL },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Ticker />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5">
          <section className="py-10 md:py-14 border-b border-border">
            <div className="eyebrow opacity-60 mb-3">Hàng hoá · Năng lượng</div>
            <h1 className="font-display text-[2rem] sm:text-[2.5rem] md:text-5xl leading-[1.1] tracking-tight text-balance">
              Giá <em className="text-[var(--gold)] not-italic italic">xăng dầu</em> hôm nay
            </h1>
            <p className="mt-4 max-w-2xl text-sm md:text-base text-foreground/80 leading-relaxed">
              Cập nhật <strong>giá xăng dầu hôm nay</strong> ({today}): bảng giá bán lẻ Petrolimex
              các mặt hàng RON 95-V, E5 RON 92, Diesel, Dầu hỏa theo kỳ điều hành mới nhất, cùng
              giá dầu thô Brent (ICE) và WTI (NYMEX) thế giới realtime theo USD/thùng.
            </p>
          </section>

          <section className="py-10 md:py-14">
            <div className="flex items-baseline justify-between mb-5 md:mb-6">
              <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Giá dầu thế giới</h2>
              <div className="eyebrow opacity-60 hidden sm:block">Brent &amp; WTI · realtime</div>
            </div>
            <OilPriceTable />
          </section>

          <section className="py-10 md:py-14 border-t border-border">
            <div className="flex items-baseline justify-between mb-5 md:mb-6">
              <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Giá xăng dầu trong nước hôm nay</h2>
              <div className="eyebrow opacity-60 hidden sm:block">Petrolimex · 34 tỉnh thành</div>
            </div>
            <VnFuelPriceTable />
          </section>

          <section className="py-10 md:py-14 border-t border-border">
            <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight mb-5 md:mb-6">
              Câu hỏi thường gặp về giá xăng dầu
            </h2>
            <div className="space-y-6">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <h3 className="font-display text-lg md:text-xl tracking-tight mb-2">{f.q}</h3>
                  <p className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-3xl">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-10 md:py-14 border-t border-border">
            <RelatedLinks current="home" title="Khám phá thêm" />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}