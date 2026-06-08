import { useEffect, useState } from "react";

/**
 * Thin progress bar fixed dưới Header, cho biết người dùng đã đọc
 * tới đâu trong trang. Tự ẩn nếu trang chưa đủ dài để cuộn.
 */
export function ReadingProgress({ topOffset = 0 }: { topOffset?: number }) {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = (doc.scrollHeight || 0) - window.innerHeight;
      if (max <= 80) {
        setShow(false);
        setProgress(0);
        return;
      }
      setShow(true);
      const pct = Math.min(100, Math.max(0, (scrollTop / max) * 100));
      setProgress(pct);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 top-0 z-50 h-[3px] bg-border/30 pointer-events-none"
      style={topOffset ? { top: topOffset } : undefined}
    >
      <div
        className="h-full bg-primary transition-[width] duration-100 ease-out shadow-[0_0_10px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Tiến độ đọc"
      />
    </div>
  );
}