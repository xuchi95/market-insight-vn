import { AdSlot } from "./AdSlot";

/** Hai cột quảng cáo dọc (skyscraper 160×600) cố định hai bên nội dung,
 *  chỉ hiển thị khi viewport ≥1440px (xem rule `.side-ad-rail` trong
 *  src/styles.css). Slot ID đọc từ env `VITE_ADSENSE_SIDEBAR_LEFT/RIGHT`
 *  — nếu chưa cấu hình, rail render placeholder reserve chỗ để admin
 *  thấy bố cục trước khi điền slot. */
const LEFT  = (import.meta.env.VITE_ADSENSE_SIDEBAR_LEFT  as string | undefined) || "";
const RIGHT = (import.meta.env.VITE_ADSENSE_SIDEBAR_RIGHT as string | undefined) || "";

function Rail({ side, slot }: { side: "left" | "right"; slot: string }) {
  return (
    <aside
      aria-label={`Quảng cáo ${side === "left" ? "trái" : "phải"}`}
      className={`side-ad-rail side-ad-rail--${side}`}
    >
      {slot ? (
        <AdSlot
          slot={slot}
          placement="sidebar"
          format="auto"
          minHeight={600}
          hideLabel
          className="!my-0 !px-0 !max-w-none w-[160px]"
        />
      ) : (
        <div className="w-[160px] h-[600px] rounded-lg border border-dashed border-border/60 bg-muted/10 flex items-center justify-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 text-center px-2">
          Ad 160×600
          <br />
          (chưa cấu hình)
        </div>
      )}
    </aside>
  );
}

export function SideAdRails() {
  return (
    <>
      <Rail side="left" slot={LEFT} />
      <Rail side="right" slot={RIGHT} />
    </>
  );
}