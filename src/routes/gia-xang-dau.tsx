import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Ticker } from "@/components/site/Ticker";
import { OilPriceTable } from "@/components/site/OilPriceTable";
import { VnFuelPriceTable } from "@/components/site/VnFuelPriceTable";
import { RelatedLinks } from "@/components/site/RelatedLinks";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/gia-xang-dau`;
const TITLE = "Giá xăng/dầu hôm nay — Brent, WTI & Petrolimex | MarketWatch";
const DESC = "Giá dầu thô Brent (ICE), WTI (NYMEX) realtime theo USD/thùng và giá xăng dầu trong nước Petrolimex (RON 95-V, E5 RON 92, Diesel…) cập nhật theo kỳ điều hành.";

export const Route = createFileRoute("/gia-xang-dau")({
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
              Giá <em className="text-[var(--gold)] not-italic italic">xăng/dầu</em> hôm nay
            </h1>
            <p className="mt-4 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
              Dầu thô thế giới (Brent, WTI) cập nhật realtime và bảng giá xăng dầu trong nước Petrolimex.
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
              <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">Giá xăng dầu trong nước</h2>
              <div className="eyebrow opacity-60 hidden sm:block">Petrolimex · 34 tỉnh thành</div>
            </div>
            <VnFuelPriceTable />
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