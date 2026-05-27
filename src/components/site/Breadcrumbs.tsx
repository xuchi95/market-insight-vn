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
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex items-center gap-2 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-2">
          <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1" itemProp="item">
            <Home className="h-3.5 w-3.5" />
            <span itemProp="name" className="sr-only">Trang chủ</span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        {crumbs.map((item, idx) => {
          const position = idx + 2;
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={idx} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="hover:text-foreground transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span className={isLast ? "text-foreground font-medium" : ""} itemProp="name">{item.label}</span>
              )}
              <meta itemProp="position" content={String(position)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
