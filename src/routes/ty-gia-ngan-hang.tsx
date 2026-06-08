import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BankRateTable } from "@/components/site/BankRateTable";
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { PageHero } from "@/components/site/PageHero";
import { DataDisclaimer } from "@/components/site/DataDisclaimer";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/ty-gia-ngan-hang`;
const TITLE = "Tỷ giá Vietcombank hôm nay — USD, EUR, JPY, CNY";
const DESC = "Tỷ giá Ngân hàng Vietcombank hôm nay: USD, EUR, JPY, CNY, GBP, KRW, SGD và nhiều ngoại tệ khác — giá mua tiền mặt, mua chuyển khoản và bán ra chính thức.";

export const Route = createFileRoute("/ty-gia-ngan-hang")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "tỷ giá vietcombank, vcb, tỷ giá ngân hàng, tỷ giá usd vietcombank, tỷ giá eur vietcombank, tỷ giá hôm nay" },
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
            { "@type": "ListItem", position: 2, name: "Tỷ giá ngân hàng", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
          about: ["Vietcombank", "Tỷ giá USD", "Tỷ giá EUR", "Tỷ giá JPY", "Tỷ giá CNY"],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Bảng tỷ giá Vietcombank hôm nay",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Tỷ giá USD Vietcombank", item: { "@type": "Thing", name: "USD VCB", description: "Tỷ giá USD tại Vietcombank — mua tiền mặt, mua chuyển khoản, bán" } },
            { "@type": "ListItem", position: 2, name: "Tỷ giá EUR Vietcombank", item: { "@type": "Thing", name: "EUR VCB", description: "Tỷ giá EUR tại Vietcombank — mua tiền mặt, mua chuyển khoản, bán" } },
            { "@type": "ListItem", position: 3, name: "Tỷ giá JPY Vietcombank", item: { "@type": "Thing", name: "JPY VCB", description: "Tỷ giá Yên Nhật tại Vietcombank — mua tiền mặt, mua chuyển khoản, bán" } },
            { "@type": "ListItem", position: 4, name: "Tỷ giá CNY Vietcombank", item: { "@type": "Thing", name: "CNY VCB", description: "Tỷ giá Nhân dân tệ tại Vietcombank — mua tiền mặt, mua chuyển khoản, bán" } },
            { "@type": "ListItem", position: 5, name: "Tỷ giá GBP Vietcombank", item: { "@type": "Thing", name: "GBP VCB", description: "Tỷ giá Bảng Anh tại Vietcombank — mua tiền mặt, mua chuyển khoản, bán" } },
            { "@type": "ListItem", position: 6, name: "Tỷ giá KRW Vietcombank", item: { "@type": "Thing", name: "KRW VCB", description: "Tỷ giá Won Hàn Quốc tại Vietcombank — mua tiền mặt, mua chuyển khoản, bán" } },
            { "@type": "ListItem", position: 7, name: "Tỷ giá SGD Vietcombank", item: { "@type": "Thing", name: "SGD VCB", description: "Tỷ giá đô-la Singapore tại Vietcombank — mua tiền mặt, mua chuyển khoản, bán" } },
          ],
        }),
      },
    ],
  }),
  component: BankRatesPage,
});

function BankRatesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5">
          <div className="pt-6 md:pt-8"><Breadcrumbs /></div>
          <PageHero
            eyebrow="Ngân hàng"
            title={<>Tỷ giá <em className="not-italic text-[var(--gold)]">Vietcombank</em> hôm nay</>}
            description={<>Giá mua tiền mặt, mua chuyển khoản và bán ra của USD, EUR, JPY, CNY, GBP, KRW, SGD và nhiều ngoại tệ khác — lấy trực tiếp từ trang chính thức Vietcombank.</>}
          />
          <DataDisclaimer className="mt-3" />
          <div className="py-8 lg:py-10 space-y-8">
          <BankRateTable />
          <RelatedLinks current="bank-rates" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
