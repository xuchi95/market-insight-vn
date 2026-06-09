import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageHero } from "@/components/site/PageHero";

const SITE = "https://marketwatch.vn";
const URL = `${SITE}/nguon-du-lieu`;
const TITLE = "Nguồn dữ liệu & phương pháp tính — MarketWatch Việt Nam";
const DESC = "Toàn bộ nguồn dữ liệu, tần suất cập nhật, múi giờ và phương pháp quy đổi VND mà MarketWatch sử dụng cho giá vàng, crypto, ngoại tệ, lãi suất, xăng dầu và chứng khoán Việt Nam.";

interface SourceRow {
  topic: string;
  source: string;
  frequency: string;
  timezone: string;
  method: string;
}

const ROWS: SourceRow[] = [
  {
    topic: "Giá vàng SJC, DOJI, PNJ, BTMC, Phú Quý",
    source: "API công khai của từng thương hiệu kim hoàn + bảng yết giá tại điểm giao dịch chính thức.",
    frequency: "Mỗi 5 giây",
    timezone: "GMT+7 (Hà Nội)",
    method: "Hiển thị nguyên giá mua – bán do thương hiệu công bố. Không can thiệp, không làm tròn.",
  },
  {
    topic: "Giá vàng thế giới XAU/USD",
    source: "Thị trường vàng quốc tế (spot), tham chiếu giá trung bình các sàn lớn.",
    frequency: "Mỗi 5 giây",
    timezone: "UTC, hiển thị quy đổi sang GMT+7",
    method: "Yết theo USD/ounce. Quy đổi sang VND/lượng = giá × tỷ giá USD/VND × hệ số (1 lượng = 37,5 g ≈ 1,20565 ounce).",
  },
  {
    topic: "Giá Bitcoin & altcoin (BTC, ETH, USDT, BNB, SOL…)",
    source: "Dữ liệu thị trường crypto toàn cầu (CoinGecko/Binance public API).",
    frequency: "Mỗi 15 giây",
    timezone: "UTC",
    method: "Giá USD bình quân khối lượng giao dịch trên các sàn lớn. Quy đổi VND theo tỷ giá USD/VND realtime mục Ngoại tệ.",
  },
  {
    topic: "Tỷ giá USD, EUR, JPY, CNY, GBP, KRW…",
    source: "Thị trường ngoại hối quốc tế + tham chiếu tỷ giá liên ngân hàng do Ngân hàng Nhà nước công bố.",
    frequency: "Mỗi 10 giây trong giờ giao dịch",
    timezone: "GMT+7",
    method: "Hiển thị giá mua – bán bình quân. Không phải tỷ giá giao dịch cụ thể của một ngân hàng.",
  },
  {
    topic: "Tỷ giá tại 20+ ngân hàng VN (VCB, BIDV, TCB…)",
    source: "Bảng tỷ giá niêm yết công khai trên website chính thức của từng ngân hàng.",
    frequency: "Mỗi 30 phút",
    timezone: "GMT+7",
    method: "Lấy nguyên giá niêm yết theo loại hình (tiền mặt / chuyển khoản). Đánh dấu thời điểm cập nhật cuối.",
  },
  {
    topic: "Lãi suất tiết kiệm 20+ ngân hàng",
    source: "Biểu lãi suất công khai trên website chính thức của từng ngân hàng.",
    frequency: "Hàng ngày, rà soát thủ công khi có công bố mới",
    timezone: "GMT+7",
    method: "Hiển thị lãi suất gửi tiết kiệm thông thường, VND, lĩnh lãi cuối kỳ. Không bao gồm khuyến mãi đặc biệt.",
  },
  {
    topic: "Giá xăng dầu Petrolimex (RON 95-V, E5 RON 92, Diesel)",
    source: "Công bố chính thức của Petrolimex theo kỳ điều hành Liên Bộ Công Thương – Tài chính.",
    frequency: "Theo kỳ điều hành 7 ngày/lần (Nghị định 80/2023/NĐ-CP)",
    timezone: "GMT+7",
    method: "Hiển thị giá vùng 1. Vùng 2 cộng thêm theo công bố Petrolimex.",
  },
  {
    topic: "Giá dầu Brent & WTI",
    source: "Thị trường hàng hoá quốc tế (ICE cho Brent, NYMEX cho WTI).",
    frequency: "Mỗi 1 phút",
    timezone: "UTC",
    method: "Yết theo USD/thùng (barrel).",
  },
  {
    topic: "Chứng khoán Việt Nam (HOSE, HNX, UPCOM)",
    source: "Dữ liệu giá đóng cửa và intraday từ các nhà cung cấp dữ liệu thị trường được cấp phép.",
    frequency: "Trong giờ giao dịch: realtime; ngoài giờ: giá đóng cửa gần nhất",
    timezone: "GMT+7",
    method: "Hiển thị giá khớp lệnh, khối lượng và biến động phiên. Không phải báo giá môi giới.",
  },
];

export const Route = createFileRoute("/nguon-du-lieu")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
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
          "@type": "TechArticle",
          headline: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "vi-VN",
          author: { "@id": SITE + "/#organization" },
          publisher: { "@id": SITE + "/#organization" },
          datePublished: "2024-01-01",
          dateModified: new Date().toISOString().slice(0, 10),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE + "/" },
            { "@type": "ListItem", position: 2, name: "Nguồn dữ liệu", item: URL },
          ],
        }),
      },
    ],
  }),
  component: SourcesPage,
});

function SourcesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5">
          <div className="pt-6 md:pt-8"><Breadcrumbs /></div>
          <PageHero
            eyebrow="Phương pháp dữ liệu"
            title={<>Nguồn dữ liệu &amp; <em className="not-italic text-[var(--gold)]">phương pháp tính</em></>}
            description={<>Mỗi con số trên MarketWatch đều có nguồn rõ ràng. Trang này liệt kê nguồn, tần suất cập nhật, múi giờ và cách quy đổi VND cho từng nhóm dữ liệu.</>}
          />

          <div className="py-8 lg:py-10 space-y-8">
            <section aria-labelledby="principles" className="prose dark:prose-invert max-w-none space-y-4">
              <h2 id="principles" className="text-2xl font-bold tracking-tight">Nguyên tắc xử lý dữ liệu</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Không tự sinh số liệu.</strong> Toàn bộ chỉ số đều được crawl từ API hoặc website chính thức của bên cung cấp.</li>
                <li><strong>Không can thiệp.</strong> Giá hiển thị giữ nguyên như công bố gốc — không làm tròn, không điều chỉnh.</li>
                <li><strong>Đối chiếu chéo.</strong> Khi có nhiều nguồn cho cùng một chỉ số, hệ thống so sánh và cảnh báo nếu sai lệch &gt; 2%.</li>
                <li><strong>Quy đổi VND minh bạch.</strong> Mọi quy đổi sang VND dùng tỷ giá USD/VND realtime ở mục <Link to="/ty-gia-ngoai-te" className="text-primary hover:underline">Tỷ giá ngoại tệ</Link>.</li>
                <li><strong>Dấu thời gian.</strong> Mỗi bảng đều ghi rõ thời điểm cập nhật cuối cùng (GMT+7).</li>
              </ul>
            </section>

            <section aria-labelledby="sources-table" className="space-y-4">
              <h2 id="sources-table" className="text-2xl font-bold tracking-tight">Chi tiết theo nhóm dữ liệu</h2>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nhóm dữ liệu</th>
                      <th className="px-4 py-3 font-semibold">Nguồn</th>
                      <th className="px-4 py-3 font-semibold">Tần suất</th>
                      <th className="px-4 py-3 font-semibold">Múi giờ</th>
                      <th className="px-4 py-3 font-semibold">Phương pháp / quy đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ROWS.map((r) => (
                      <tr key={r.topic} className="align-top">
                        <td className="px-4 py-3 font-semibold text-foreground">{r.topic}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.source}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.frequency}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.timezone}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="review-note" className="prose dark:prose-invert max-w-none space-y-4">
              <h2 id="review-note" className="text-2xl font-bold tracking-tight">Ai chịu trách nhiệm về số liệu?</h2>
              <p className="text-muted-foreground">
                Dữ liệu được kiểm duyệt bởi <strong>đội ngũ kỹ thuật của MarketWatch Việt Nam</strong>. Người chịu trách nhiệm pháp lý: <strong>Ông Nguyễn Xuân Chính</strong> — đại diện Công ty TNHH MTV Xuân Diệu Media. Phát hiện sai lệch? Báo cáo tại <Link to="/lien-he" className="text-primary hover:underline">/lien-he</Link>, chúng tôi cam kết xử lý trong 24 giờ.
              </p>
              <p className="text-muted-foreground">
                Xem thêm: <Link to="/ve-chung-toi" className="text-primary hover:underline">Về MarketWatch</Link> · <Link to="/mien-tru-trach-nhiem" className="text-primary hover:underline">Miễn trừ trách nhiệm</Link> · <Link to="/dieu-khoan-su-dung" className="text-primary hover:underline">Điều khoản sử dụng</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}