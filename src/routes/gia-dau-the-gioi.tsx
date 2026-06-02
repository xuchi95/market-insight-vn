import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Ticker } from "@/components/site/Ticker";
import { OilPriceTable } from "@/components/site/OilPriceTable";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/gia-dau-the-gioi`;
const TITLE = "Giá dầu thế giới hôm nay — Brent & WTI realtime | MarketWatch";
const DESC = "Giá dầu thô Brent (ICE) và WTI (NYMEX) cập nhật realtime theo USD/thùng, kèm thay đổi so với phiên đóng cửa trước — nguồn Yahoo Finance.";

export const Route = createFileRoute("/gia-dau-the-gioi")({
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
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Ticker />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5">
          <section className="py-10 md:py-14 border-b border-border">
            <div className="eyebrow opacity-60 mb-3">Hàng hoá · Năng lượng</div>
            <h1 className="font-display text-[2rem] sm:text-[2.5rem] md:text-5xl leading-[1.1] tracking-tight text-balance">
              Giá <em className="text-[var(--gold)] not-italic italic">dầu thế giới</em> hôm nay
            </h1>
            <p className="mt-4 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
              Brent (ICE) và WTI (NYMEX) — USD/thùng, cập nhật realtime theo Yahoo Finance.
            </p>
          </section>

          <section className="py-10 md:py-14">
            <OilPriceTable />
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