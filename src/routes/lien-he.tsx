import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/lien-he`;
const TITLE = "Liên hệ MarketWatch — Email hỗ trợ, hợp tác & phản ánh nội dung";
const DESC = "Liên hệ MarketWatch qua email contact@marketwatch.vn (hỗ trợ người dùng, góp ý dữ liệu, hợp tác) hoặc legal@marketwatch.vn (phản ánh nội dung, yêu cầu từ cơ quan nhà nước). Phản hồi trong 24–72 giờ làm việc.";
const OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b8c9b171-48fc-42a5-b09c-62d699f826fa";

export const Route = createFileRoute("/lien-he")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "liên hệ marketwatch, email marketwatch, hợp tác marketwatch, phản ánh nội dung, contact marketwatch vn, marketwatch việt nam" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
      { property: "og:site_name", content: "MarketWatch" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "MarketWatch — Liên hệ hỗ trợ và hợp tác" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@marketwatchvn" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "MarketWatch — Liên hệ hỗ trợ và hợp tác" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "@id": URL + "#contactpage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
          isPartOf: { "@type": "WebSite", "@id": SITE + "/#website" },
          about: { "@id": SITE + "/#organization" },
          mainEntity: {
            "@type": "Organization",
            "@id": SITE + "/#organization",
            name: "MarketWatch",
            url: SITE,
            email: "contact@marketwatch.vn",
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "contact@marketwatch.vn",
                areaServed: "VN",
                availableLanguage: ["Vietnamese", "English"],
              },
              {
                "@type": "ContactPoint",
                contactType: "legal",
                email: "legal@marketwatch.vn",
                areaServed: "VN",
                availableLanguage: ["Vietnamese", "English"],
              },
            ],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE },
            { "@type": "ListItem", position: 2, name: "Liên hệ" },
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
        <div className="mx-auto max-w-6xl px-5 py-8 lg:py-12 space-y-6">
          <Breadcrumbs />
          <header>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Liên hệ MarketWatch</h1>
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
            <ContactForm />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}