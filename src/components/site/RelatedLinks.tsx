import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Coins, Bitcoin, DollarSign, Repeat, LineChart, Landmark, PiggyBank, Globe2 } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

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
  | "bank-rates"
  | "savings"
  | "economy";

type LinkItem = {
  to: string;
  keyword: string; // anchor text giàu từ khóa
  desc: string;
  eyebrow: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const ALL: Record<Exclude<PageKey, "home">, LinkItem> = {
  gold: {
    to: "/gia-vang",
    keyword: "Giá vàng SJC hôm nay",
    desc: "Giá vàng SJC, DOJI, PNJ, BTMC và XAU/USD realtime.",
    eyebrow: "Kim loại quý",
    Icon: Coins,
  },
  crypto: {
    to: "/tien-dien-tu",
    keyword: "Giá Bitcoin (BTC) hôm nay",
    desc: "Giá BTC, ETH, USDT, BNB, SOL theo USD và VND.",
    eyebrow: "Tiền điện tử",
    Icon: Bitcoin,
  },
  forex: {
    to: "/ty-gia-ngoai-te",
    keyword: "Tỷ giá USD/VND hôm nay",
    desc: "Tỷ giá USD, EUR, JPY, GBP, AUD ngân hàng và chợ đen.",
    eyebrow: "Ngoại tệ",
    Icon: DollarSign,
  },
  converter: {
    to: "/quy-doi-tien-te",
    keyword: "Công cụ quy đổi tiền tệ",
    desc: "Quy đổi USD ↔ VND, BTC ↔ USD, vàng ↔ VND tức thì.",
    eyebrow: "Công cụ",
    Icon: Repeat,
  },
  stocks: {
    to: "/chung-khoan",
    keyword: "Chỉ số chứng khoán VN-Index",
    desc: "VN-Index, HNX-Index, UPCOM và chỉ số quốc tế.",
    eyebrow: "Chứng khoán",
    Icon: LineChart,
  },
  "bank-rates": {
    to: "/ty-gia-ngan-hang",
    keyword: "Lãi suất ngân hàng hôm nay",
    desc: "Lãi suất tiết kiệm Vietcombank, BIDV, Techcombank…",
    eyebrow: "Ngân hàng",
    Icon: Landmark,
  },
  savings: {
    to: "/lai-suat-tiet-kiem",
    keyword: "Lãi suất tiết kiệm 20+ ngân hàng",
    desc: "So sánh lãi suất gửi tiết kiệm các kỳ hạn 1, 3, 6, 12 tháng.",
    eyebrow: "Tiết kiệm",
    Icon: PiggyBank,
  },
  economy: {
    to: "/vi-mo-viet-nam",
    keyword: "Kinh tế vĩ mô Việt Nam",
    desc: "GDP, lạm phát CPI, thất nghiệp, dự trữ ngoại hối (World Bank).",
    eyebrow: "Vĩ mô",
    Icon: Globe2,
  },
};

// Gợi ý liên kết liên quan cho mỗi trang (tránh tự liên kết).
const RELATED: Record<PageKey, (keyof typeof ALL)[]> = {
  home: ["gold", "crypto", "forex", "stocks", "savings", "economy"],
  gold: ["forex", "converter", "crypto", "economy"],
  crypto: ["converter", "forex", "gold", "stocks"],
  forex: ["converter", "bank-rates", "savings", "economy"],
  converter: ["forex", "crypto", "gold", "savings"],
  stocks: ["forex", "crypto", "economy", "savings"],
  "bank-rates": ["savings", "forex", "converter", "economy"],
  savings: ["bank-rates", "forex", "economy", "converter"],
  economy: ["stocks", "forex", "savings", "gold"],
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
    <section aria-labelledby="related-links" className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
        <h2 id="related-links" className="font-display text-2xl md:text-3xl tracking-tight">
          {title}
        </h2>
        <span className="eyebrow opacity-70 hidden sm:inline">{items.length} chủ đề</span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ to, keyword, desc, eyebrow, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group relative flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-5 transition-all hover:border-[var(--gold)]/70 hover:bg-accent/40 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-[var(--gold)]">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:text-[var(--gold)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="space-y-1.5">
                <span className="eyebrow opacity-80">{eyebrow}</span>
                <span className="block font-display text-lg leading-snug text-foreground">
                  {keyword}
                </span>
                <span className="block text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </span>
              </div>
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