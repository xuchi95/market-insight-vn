import { Link, useRouter } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  gold: "Giá vàng",
  crypto: "Giá crypto",
  forex: "Tỷ giá ngoại tệ",
  stocks: "Chứng khoán",
  "bank-rates": "Tỷ giá ngân hàng",
  converter: "Đổi ngoại tệ",
  contact: "Liên hệ",
  "lien-he": "Liên hệ",
  "gia-vang": "Giá vàng",
  "tien-dien-tu": "Tiền điện tử",
  "ty-gia-ngoai-te": "Tỷ giá ngoại tệ",
  "ty-gia-ngan-hang": "Tỷ giá ngân hàng",
  "chung-khoan": "Chứng khoán",
  "quy-doi-tien-te": "Quy đổi tiền tệ",
  "tai-san": "Tài sản",
  "dang-ky": "Đăng ký",
  "dang-nhap": "Đăng nhập",
  "chinh-sach-bao-mat": "Chính sách bảo mật",
  "dieu-khoan-su-dung": "Điều khoản sử dụng",
  "mien-tru-trach-nhiem": "Miễn trừ trách nhiệm",
  "cai-dat": "Cài đặt",
  "ban-tin": "Bản tin",
  "lich-kinh-te": "Lịch kinh tế",
  "vi-mo-viet-nam": "Kinh tế vĩ mô Việt Nam",
  "lai-suat-tiet-kiem": "Lãi suất tiết kiệm",
  "cong-cu": "Công cụ",
  "dca-roi": "DCA & ROI",
  "portfolio": "Danh mục",
  "du-doan-gia-ai": "AI dự đoán giá",
  privacy: "Chính sách dữ liệu",
  terms: "Điều khoản sử dụng",
  disclaimer: "Tuyên bố miễn trừ trách nhiệm",
};

interface CrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumbs({ extra }: { extra?: CrumbItem[] }) {
  const router = useRouter();
  const path = router.state.location.pathname;
  if (path === "/" || path === "") return null;

  const segments = path.split("/").filter(Boolean);
  const first = segments[0];
  const label = PAGE_LABELS[first] || first;

  const crumbs: CrumbItem[] = extra?.length
    ? extra
    : [{ label }];

  return (
    <nav className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
      <ol className="flex items-center gap-1.5 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-2">
          <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1" itemProp="item">
            <Home className="h-3 w-3" />
            <span itemProp="name" className="sr-only">Trang chủ</span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        {crumbs.map((item, idx) => {
          const position = idx + 2;
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={idx} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="hover:text-foreground transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span className={isLast ? "text-[color-mix(in_oklab,var(--gold)_85%,transparent)]" : ""} itemProp="name">{item.label}</span>
              )}
              <meta itemProp="position" content={String(position)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
