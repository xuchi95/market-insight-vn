import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

interface Props {
  title?: string;
  description?: string;
  compact?: boolean;
}

/**
 * Khối khoá hiển thị thay cho dữ liệu realtime / chart nâng cao
 * khi user chưa đăng nhập. CTA dẫn về `/dang-nhap` & `/dang-ky`.
 */
export function LockedDataPanel({
  title = "Chỉ thành viên đăng nhập mới xem được",
  description = "Dữ liệu giá realtime và biểu đồ nâng cao của MarketWatch dành riêng cho thành viên. Đăng ký miễn phí trong 30 giây.",
  compact = false,
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-center ${
        compact ? "px-4 py-8" : "px-6 py-14"
      }`}
    >
      <div className="rounded-full border border-gold/30 bg-gold/10 p-3">
        <Lock className="h-5 w-5 text-gold" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          to="/dang-nhap"
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          Đăng nhập
        </Link>
        <Link
          to="/dang-ky"
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted/40 transition-colors"
        >
          Đăng ký miễn phí
        </Link>
      </div>
    </div>
  );
}