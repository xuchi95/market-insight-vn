/**
 * Single canonical disclaimer line shown right under the H1 of every
 * data-driven page. Replaces the various badges, "Nguồn ..." chips and
 * repeated warning paragraphs that used to clutter each page.
 */
export function DataDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground italic ${className}`}>
      Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
    </p>
  );
}