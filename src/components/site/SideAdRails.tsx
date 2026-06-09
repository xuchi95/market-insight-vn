import { useEffect } from "react";
import { AdSlot } from "./AdSlot";

/** Hai cột quảng cáo dọc (skyscraper 160×600) cố định hai bên nội dung,
 *  chỉ hiển thị khi viewport ≥1440px (xem rule `.side-ad-rail` trong
 *  src/styles.css). Slot ID đọc từ env `VITE_ADSENSE_SIDEBAR_LEFT/RIGHT`
 *  — nếu chưa cấu hình, rail render placeholder reserve chỗ để admin
 *  thấy bố cục trước khi điền slot. */
const LEFT  = (import.meta.env.VITE_ADSENSE_SIDEBAR_LEFT  as string | undefined) || "";
const RIGHT = (import.meta.env.VITE_ADSENSE_SIDEBAR_RIGHT as string | undefined) || "";

function Rail({ side, slot }: { side: "left" | "right"; slot: string }) {
  // Chỉ render khi slot ID đã được cấu hình thật sự. Không hiển thị
  // placeholder để tránh chèn lên layout khi chưa có ad.
  if (!slot) return null;
  return (
    <aside
      aria-label={`Quảng cáo ${side === "left" ? "trái" : "phải"}`}
      className={`side-ad-rail side-ad-rail--${side}`}
    >
      <AdSlot
        slot={slot}
        placement="sidebar"
        format="auto"
        minHeight={600}
        hideLabel
        className="!my-0 !px-0 !max-w-none w-[160px]"
      />
    </aside>
  );
}

export function SideAdRails() {
  // Không có slot nào được cấu hình → không render gì cả, layout chính
  // giữ nguyên width như chưa có ad rail.
  const active = Boolean(LEFT || RIGHT);
  useEffect(() => {
    if (typeof document === "undefined" || !active) return;
    document.body.classList.add("with-ad-rails");
    return () => document.body.classList.remove("with-ad-rails");
  }, [active]);
  if (!active) return null;
  return (
    <>
      <Rail side="left" slot={LEFT} />
      <Rail side="right" slot={RIGHT} />
    </>
  );
}