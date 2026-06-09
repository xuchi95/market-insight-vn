import { Link } from "@tanstack/react-router";

/**
 * Single canonical disclaimer line shown right under the H1 of every
 * data-driven page. Replaces the various badges, "Nguồn ..." chips and
 * repeated warning paragraphs that used to clutter each page.
 *
 * Also surfaces the "reviewed by" credit + link to the methodology page
 * — improves E-E-A-T signals for finance content.
 */
export function DataDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground italic ${className}`}>
      Dữ liệu được kiểm duyệt bởi <strong className="not-italic font-medium text-foreground/80">MarketWatch Việt Nam</strong> ·{" "}
      <Link to="/nguon-du-lieu" className="not-italic underline decoration-dotted hover:text-foreground">
        Nguồn &amp; phương pháp tính
      </Link>{" "}
      · Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
    </p>
  );
}