import { Link } from "@tanstack/react-router";

// Bản đồ từ khóa → đường dẫn nội bộ. Dùng để tự động gợi ý
// liên kết chéo giữa các trang chủ đề (gold/crypto/forex/converter…)
// nhằm cải thiện cấu trúc internal-linking cho SEO.
export type PageKey =
  | "home"
  | "gold"
  | "crypto"
  | "forex"
  | "converter"
  | "stocks"
  | "bank-rates";

type LinkItem = {
  to: string;
  keyword: string; // anchor text giàu từ khóa
  desc: string;
};

const ALL: Record<Exclude<PageKey, "home">, LinkItem> = {
  gold: {
    to: "/gia-vang",
    keyword: "Giá vàng SJC hôm nay",
    desc: "Giá vàng SJC, DOJI, PNJ, BTMC và XAU/USD realtime.",
  },
  crypto: {
    to: "/tien-dien-tu",
    keyword: "Giá Bitcoin (BTC) hôm nay",
    desc: "Giá BTC, ETH, USDT, BNB, SOL theo USD và VND.",
  },
  forex: {
    to: "/ty-gia-ngoai-te",
    keyword: "Tỷ giá USD/VND hôm nay",
    desc: "Tỷ giá USD, EUR, JPY, GBP, AUD ngân hàng và chợ đen.",
  },
  converter: {
    to: "/quy-doi-tien-te",
    keyword: "Công cụ quy đổi tiền tệ",
    desc: "Quy đổi USD ↔ VND, BTC ↔ USD, vàng ↔ VND tức thì.",
  },
  stocks: {
    to: "/chung-khoan",
    keyword: "Chỉ số chứng khoán VN-Index",
    desc: "VN-Index, HNX-Index, UPCOM và chỉ số quốc tế.",
  },
  "bank-rates": {
    to: "/lai-suat-ngan-hang",
    keyword: "Lãi suất ngân hàng hôm nay",
    desc: "Lãi suất tiết kiệm Vietcombank, BIDV, Techcombank…",
  },
};

// Gợi ý liên kết liên quan cho mỗi trang (tránh tự liên kết).
const RELATED: Record<PageKey, (keyof typeof ALL)[]> = {
  home: ["gold", "crypto", "forex", "converter", "stocks", "bank-rates"],
  gold: ["forex", "converter", "crypto", "bank-rates"],
  crypto: ["converter", "forex", "gold", "stocks"],
  forex: ["converter", "bank-rates", "gold", "crypto"],
  converter: ["forex", "crypto", "gold", "bank-rates"],
  stocks: ["forex", "crypto", "gold", "bank-rates"],
  "bank-rates": ["forex", "converter", "gold", "stocks"],
};

export function RelatedLinks({
  current,
  title = "Xem thêm chủ đề liên quan",
}: {
  current: PageKey;
  title?: string;
}) {
  const items = RELATED[current].map((k) => ALL[k]);
  return (
    <section aria-labelledby="related-links" className="space-y-4">
      <h2
        id="related-links"
        className="text-2xl font-bold tracking-tight"
      >
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <li key={i.to}>
            <Link
              to={i.to}
              className="block h-full rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/60 hover:bg-accent"
            >
              <span className="block font-semibold text-foreground">
                {i.keyword}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {i.desc}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Inline helper: chèn 1 liên kết nội bộ ngữ cảnh trong câu văn.
export function InlineLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}