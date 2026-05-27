import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/lien-he`;
const TITLE = "Liên hệ — MarketWatch";
const DESC = "Liên hệ MarketWatch để phản ánh dữ liệu, hợp tác hoặc gửi yêu cầu hợp pháp từ cơ quan có thẩm quyền.";

export const Route = createFileRoute("/lien-he")({
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
          "@type": "ContactPage",
          name: TITLE,
          url: URL,
          inLanguage: "vi-VN",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Liên hệ", item: URL },
          ],
        }),
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl space-y-6">
          <Breadcrumbs />
          <header>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Liên hệ MarketWatch</h1>
            <p className="mt-2 text-muted-foreground">Chúng tôi luôn sẵn sàng tiếp nhận phản ánh và phối hợp với cơ quan chức năng.</p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="eyebrow opacity-70 mb-2">Email chung</h2>
              <a href="mailto:contact@marketwatch.vn" className="text-foreground font-medium underline">contact@marketwatch.vn</a>
              <p className="mt-2 text-sm text-muted-foreground">Hỗ trợ người dùng, góp ý nội dung, đối tác dữ liệu.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="eyebrow opacity-70 mb-2">Phản ánh nội dung</h2>
              <a href="mailto:legal@marketwatch.vn" className="text-foreground font-medium underline">legal@marketwatch.vn</a>
              <p className="mt-2 text-sm text-muted-foreground">Tiếp nhận yêu cầu gỡ bỏ, đính chính, văn bản từ cơ quan nhà nước có thẩm quyền.</p>
            </div>
          </section>

          <section className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
            <h2 className="text-xl font-semibold text-foreground">Cam kết phối hợp</h2>
            <p>
              MarketWatch tuân thủ pháp luật Việt Nam và sẵn sàng phối hợp với các cơ quan quản lý nhà nước (Bộ Thông tin và Truyền thông, Bộ Công an, Ngân hàng Nhà nước, cơ quan thuế…) khi có yêu cầu hợp pháp bằng văn bản. Thời gian phản hồi: trong vòng 24–72 giờ làm việc.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Gửi liên hệ trực tiếp</h2>
            <p className="text-sm text-muted-foreground">Điền form bên dưới, chúng tôi sẽ gửi email xác nhận và phản hồi sớm.</p>
            <ContactForm />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}