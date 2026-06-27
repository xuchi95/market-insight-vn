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
  home: ["gold", "crypto", "forex", "stocks", "savings"],
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
  gridClassName,
}: {
  current: PageKey;
  title?: string;
  gridClassName?: string;
}) {
  const items = RELATED[current].map((k) => ALL[k]);
  return (
    <section aria-labelledby="related-links" className="space-y-5 md:space-y-6">
      <div className="flex items-end justify-between gap-4 border-t border-border/60 pt-5">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]/80">
            <span className="inline-block h-px w-6 bg-[var(--gold)]/60" />
            Điều hướng
          </div>
          <h2 id="related-links" className="font-display text-2xl md:text-3xl leading-tight tracking-tight">
            {title}
          </h2>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 tabular shrink-0">
          <span className="text-[var(--gold)] font-medium">{String(items.length).padStart(2, "0")}</span>
          chủ đề
        </span>
      </div>
      <ul className={gridClassName ?? "grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {items.map(({ to, keyword, desc, eyebrow, Icon }, idx) => (
          <li key={to}>
            <Link
              to={to}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_14%,var(--border))] bg-card/70 transition-all duration-300 hover:border-[color-mix(in_oklab,var(--gold)_45%,var(--border))] hover:bg-card hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-22px_color-mix(in_oklab,var(--gold)_45%,transparent)]"
            >
              {/* gold top hairline that animates on hover */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/70 to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100"
              />
              {/* corner index */}
              <span
                aria-hidden
                className="absolute right-4 top-4 text-[10px] tabular tracking-[0.18em] text-muted-foreground/40 transition-colors group-hover:text-[var(--gold)]/70"
              >
                {String(idx + 1).padStart(2, "0")}
              </span>

              <div className="flex flex-col gap-4 p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--gold)_22%,var(--border))] bg-gradient-to-br from-[color-mix(in_oklab,var(--gold)_18%,transparent)] to-transparent text-[var(--gold)] shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)] transition-transform duration-300 group-hover:scale-[1.04]">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div className="space-y-2">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--gold)]/85">
                    {eyebrow}
                  </span>
                  <span className="block font-display text-[17px] md:text-lg leading-snug text-foreground">
                    {keyword}
                  </span>
                  <span className="block text-[13px] text-muted-foreground/90 leading-relaxed line-clamp-2">
                    {desc}
                  </span>
                </div>
              </div>

              {/* footer meta row */}
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/50 px-5 md:px-6 py-3 text-[11px] text-muted-foreground/80">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]/80 shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_18%,transparent)]" />
                  Cập nhật realtime
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-[var(--gold)] transition-transform duration-300 group-hover:translate-x-0.5">
                  Khám phá
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
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