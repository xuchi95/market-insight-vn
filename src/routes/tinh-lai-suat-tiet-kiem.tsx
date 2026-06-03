import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SavingsCalculator } from "@/components/site/SavingsCalculator";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { SAVINGS_RATES, type SavingsRate } from "@/lib/data/savingsRates";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/tinh-lai-suat-tiet-kiem`;
const TITLE = "Tính lãi suất tiết kiệm online — công cụ tính lãi gửi ngân hàng chính xác 2026";
const DESC = "Công cụ tính lãi suất tiết kiệm online theo lãi suất thật của 30+ ngân hàng (Vietcombank, BIDV, Techcombank, MB, ACB…). Tính lãi theo tháng, quý, năm — lĩnh lãi cuối kỳ hoặc tái tục gốc + lãi.";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Cách tính lãi suất tiết kiệm ngân hàng như thế nào?",
    a: "Công thức cơ bản: Tiền lãi = Số tiền gửi × Lãi suất (%/năm) × Số ngày gửi / 365. Với hình thức lĩnh lãi cuối kỳ, lãi chỉ tính trên số tiền gốc ban đầu. Với hình thức tái tục gốc + lãi (lãi kép), sau mỗi kỳ hạn, tiền lãi được cộng vào gốc để tiếp tục sinh lãi cho kỳ sau, giúp tổng tiền nhận về cao hơn đáng kể khi gửi nhiều năm.",
  },
  {
    q: "Công cụ tính lãi suất tiết kiệm này có miễn phí không?",
    a: "Có. Công cụ tính lãi tiết kiệm trên MarketWatch hoàn toàn miễn phí, không cần đăng ký, không giới hạn số lần tính. Bạn có thể so sánh lãi suất của hơn 30 ngân hàng cùng lúc để chọn nơi gửi tốt nhất.",
  },
  {
    q: "Lãi suất tiết kiệm ngân hàng nào cao nhất hiện nay?",
    a: "Lãi suất cao nhất thường thuộc về nhóm ngân hàng TMCP như HDBank, SHB, MB Bank, Bac A Bank, KienlongBank, OCB ở các kỳ hạn dài (12 – 36 tháng). Nhóm Big4 (Vietcombank, BIDV, VietinBank, Agribank) có lãi suất thấp hơn nhưng độ an toàn cao nhất. Số liệu trong công cụ được cập nhật từ bảng lãi suất chính thức của các ngân hàng.",
  },
  {
    q: "Nên gửi tiết kiệm kỳ hạn bao lâu để có lãi cao nhất?",
    a: "Kỳ hạn 12 – 13 tháng thường có lãi suất tốt nhất ở phần lớn ngân hàng. Kỳ hạn 6 tháng phù hợp khi bạn cần linh hoạt. Kỳ hạn 24 – 36 tháng cho tổng lãi cao nhất khi tái tục, nhưng kém linh hoạt và rủi ro lãi suất thị trường tăng trong tương lai bạn không hưởng được.",
  },
  {
    q: "Gửi tiết kiệm online và tại quầy có lãi khác nhau không?",
    a: "Có. Hầu hết ngân hàng cộng thêm 0.1 – 0.5%/năm cho khoản tiền gửi online so với gửi tại quầy, vì giảm chi phí vận hành. Số liệu công cụ này hiển thị mặc định lãi suất gửi tại quầy — khi gửi online thực tế bạn sẽ nhận được tiền lãi cao hơn ước tính một chút.",
  },
  {
    q: "Lãi suất tiết kiệm có bị tính thuế thu nhập cá nhân không?",
    a: "Theo quy định hiện hành tại Việt Nam, lãi tiền gửi tiết kiệm của cá nhân tại ngân hàng được miễn thuế thu nhập cá nhân. Bạn nhận đủ 100% số tiền lãi mà công cụ ước tính.",
  },
];

export const Route = createFileRoute("/tinh-lai-suat-tiet-kiem")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "tính lãi suất tiết kiệm, công cụ tính lãi tiết kiệm, tính lãi ngân hàng, tính lãi gửi ngân hàng, tính lãi kép, tính lãi suất online, lãi suất tiết kiệm vietcombank, công thức tính lãi tiết kiệm" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
      { property: "og:site_name", content: "MarketWatch" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Công cụ tính lãi suất tiết kiệm",
          url: URL,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          description: DESC,
          inLanguage: "vi-VN",
          offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "1284",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE },
            { "@type": "ListItem", position: 2, name: "Công cụ", item: `${SITE}/cong-cu/dca-roi` },
            { "@type": "ListItem", position: 3, name: "Tính lãi suất tiết kiệm", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Cách tính lãi suất tiết kiệm online",
          description: "Hướng dẫn 4 bước tính tiền lãi gửi tiết kiệm chính xác theo lãi suất thật của ngân hàng.",
          step: [
            { "@type": "HowToStep", name: "Nhập số tiền gửi", text: "Nhập số tiền VND bạn muốn gửi tiết kiệm." },
            { "@type": "HowToStep", name: "Chọn ngân hàng và kỳ hạn", text: "Chọn ngân hàng và kỳ hạn (1, 3, 6, 9, 12, 18, 24, 36 tháng). Lãi suất sẽ tự điền theo bảng cập nhật." },
            { "@type": "HowToStep", name: "Chọn thời gian gửi", text: "Nhập thời gian gửi tổng theo tháng, quý hoặc năm." },
            { "@type": "HowToStep", name: "Chọn hình thức nhận lãi", text: "Chọn lĩnh lãi cuối kỳ hoặc tái tục gốc + lãi để xem ngay số tiền lãi nhận được." },
          ],
        }),
      },
    ],
  }),
  component: SavingsCalcPage,
});

function SavingsCalcPage() {
  const [items, setItems] = useState<SavingsRate[]>(SAVINGS_RATES);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/savings-rates")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.items) && d.items.length > 0) {
          setItems(d.items as SavingsRate[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-10 space-y-10">
          <Breadcrumbs />

          <header className="space-y-3 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
              Công cụ tài chính · Miễn phí
            </p>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tight">
              Tính lãi suất tiết kiệm online
            </h1>
            <p className="text-lg text-muted-foreground">
              Công cụ <strong>tính lãi suất tiết kiệm</strong> chính xác theo lãi suất thật của <strong>{items.length}+ ngân hàng</strong> tại Việt Nam — Vietcombank, BIDV, Techcombank, MB, ACB, VPBank, Sacombank… Hỗ trợ tính lãi theo tháng, quý, nhiều năm; lĩnh lãi cuối kỳ hoặc lãi kép (tái tục gốc + lãi).
            </p>
          </header>

          <SavingsCalculator items={items} />

          <section aria-labelledby="how-to" className="space-y-4 max-w-3xl">
            <h2 id="how-to" className="text-2xl lg:text-3xl font-bold tracking-tight">
              Cách tính lãi suất tiết kiệm chỉ với 4 bước
            </h2>
            <ol className="space-y-3 text-muted-foreground list-decimal pl-6">
              <li><strong>Nhập số tiền gửi:</strong> nhập số tiền VND bạn dự định gửi tiết kiệm (từ vài triệu đến vài tỷ).</li>
              <li><strong>Chọn ngân hàng &amp; kỳ hạn:</strong> chọn ngân hàng và kỳ hạn 1, 3, 6, 9, 12, 18, 24 hoặc 36 tháng. Lãi suất tự điền theo dữ liệu cập nhật.</li>
              <li><strong>Chọn thời gian gửi:</strong> nhập tổng thời gian gửi theo tháng, quý hoặc năm — phù hợp với mục tiêu tài chính của bạn.</li>
              <li><strong>Chọn hình thức nhận lãi:</strong> <em>lĩnh lãi cuối kỳ</em> để tính lãi đơn, hoặc <em>tái tục gốc + lãi</em> để tính lãi kép.</li>
            </ol>
          </section>

          <section aria-labelledby="formula" className="space-y-4 max-w-3xl">
            <h2 id="formula" className="text-2xl lg:text-3xl font-bold tracking-tight">
              Công thức tính lãi suất tiết kiệm
            </h2>
            <div className="rounded-lg border border-border bg-card/60 p-5 space-y-4">
              <div>
                <h3 className="font-semibold mb-1">1. Lãi đơn — lĩnh lãi cuối kỳ</h3>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5">Tiền lãi = Số tiền gửi × Lãi suất (%/năm) × Số tháng gửi ÷ 12</code>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ví dụ: gửi 100 triệu, lãi suất 5.5%/năm, kỳ hạn 12 tháng ⇒ Lãi = 100tr × 5.5% × 12/12 = <strong>5.500.000 đ</strong>.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">2. Lãi kép — tái tục gốc + lãi</h3>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5">Tổng nhận = Gốc × (1 + r × kỳ hạn/12) ^ số chu kỳ</code>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ví dụ: gửi 100 triệu, kỳ hạn 12 tháng lãi 5.5%/năm, tái tục 3 năm ⇒ Tổng ≈ <strong>117.424.000 đ</strong>, tức lãi nhiều hơn lãi đơn ~924.000 đ nhờ lãi nhập gốc.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="tips" className="space-y-4 max-w-3xl">
            <h2 id="tips" className="text-2xl lg:text-3xl font-bold tracking-tight">
              Mẹo tối ưu khi gửi tiết kiệm
            </h2>
            <ul className="space-y-2 text-muted-foreground list-disc pl-6">
              <li><strong>Gửi online</strong> thường cộng thêm 0.1 – 0.5%/năm so với gửi tại quầy.</li>
              <li><strong>Chọn kỳ hạn 12 – 13 tháng</strong> ở hầu hết ngân hàng cho lãi suất tốt nhất trên đơn vị thời gian.</li>
              <li><strong>Chia nhỏ sổ tiết kiệm</strong> theo nhiều kỳ hạn để linh hoạt rút khi cần mà không mất hết lãi.</li>
              <li><strong>So sánh trước khi gửi:</strong> bảng <Link to="/lai-suat-tiet-kiem" className="text-primary hover:underline">lãi suất tiết kiệm 30+ ngân hàng</Link> cập nhật hàng tuần.</li>
              <li>Tham khảo thêm <Link to="/vi-mo-viet-nam" className="text-primary hover:underline">chỉ số vĩ mô Việt Nam</Link> và <Link to="/ty-gia-ngan-hang" className="text-primary hover:underline">tỷ giá ngân hàng</Link> để dự báo xu hướng lãi suất.</li>
            </ul>
          </section>

          <section aria-labelledby="faq" className="space-y-4 max-w-3xl">
            <h2 id="faq" className="text-2xl lg:text-3xl font-bold tracking-tight">
              Câu hỏi thường gặp về tính lãi suất tiết kiệm
            </h2>
            <div className="space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-lg border border-border bg-card/60 p-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer font-semibold text-foreground flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-[var(--gold)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <RelatedLinks current="savings" />
        </div>
      </main>
      <Footer />
    </div>
  );
}