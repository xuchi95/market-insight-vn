import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface OhlcvTooltipOptions {
  intraday?: boolean;
  /** Đơn vị giá hiển thị sau số (vd "nghìn ₫", "$", "VND"). */
  unit?: string;
  /** Số chữ số thập phân cho giá. */
  digits?: number;
  /** Hệ số chia giá (vd 1000 nếu API trả theo VND mà muốn hiện nghìn). */
  scale?: number;
  /** Nhãn dòng giá đóng cửa hiện tại (mặc định "Đóng cửa"; intraday: "Giá"). */
  closeLabel?: string;
}

function fmtVol(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + " tr";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + " k";
  return Math.round(v).toLocaleString("vi-VN");
}

/**
 * Tooltip Recharts hiển thị O/H/L/C + Volume.
 * Đọc o/h/l/v/vol từ payload[0].payload — tương thích với các chart đang dùng
 * key `v` cho giá đóng cửa và `vol` cho khối lượng.
 */
export function OhlcvTooltip({
  active,
  payload,
  label,
  opts,
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  opts?: OhlcvTooltipOptions;
}) {
  if (!active || !payload?.length) return null;
  const p: any = payload[0].payload ?? {};
  const { intraday, unit = "", digits = 2, scale = 1, closeLabel } = opts ?? {};
  const fmtP = (n: number | undefined | null) =>
    n == null || !Number.isFinite(n) ? "—" : `${fmtNum((n as number) / scale, digits)}${unit ? " " + unit : ""}`;

  const o = p.o as number | undefined;
  const h = p.h as number | undefined;
  const l = p.l as number | undefined;
  const c = (p.v ?? p.c) as number | undefined;
  const vol = (p.vol ?? p.volume) as number | undefined;

  const ts = typeof label === "number" ? label : Number(label);
  const when = Number.isFinite(ts)
    ? intraday
      ? new Date(ts).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const up = o != null && c != null ? c >= o : true;
  const cLabel = closeLabel ?? (intraday ? "Giá" : "Đóng");

  return (
    <div
      role="tooltip"
      className="rounded-xl border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs shadow-lg min-w-[168px]"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {when && <div className="font-semibold text-foreground mb-1.5">{when}</div>}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {o != null && (
          <>
            <span className="text-muted-foreground">Mở</span>
            <span className="text-right text-foreground">{fmtP(o)}</span>
          </>
        )}
        {h != null && (
          <>
            <span className="text-muted-foreground">Cao</span>
            <span className="text-right text-[var(--up)]">{fmtP(h)}</span>
          </>
        )}
        {l != null && (
          <>
            <span className="text-muted-foreground">Thấp</span>
            <span className="text-right text-[var(--down)]">{fmtP(l)}</span>
          </>
        )}
        {c != null && (
          <>
            <span className="text-muted-foreground">{cLabel}</span>
            <span className={cn("text-right font-semibold", up ? "text-[var(--up)]" : "text-[var(--down)]")}>{fmtP(c)}</span>
          </>
        )}
        {vol != null && vol > 0 && (
          <>
            <span className="text-muted-foreground">KL</span>
            <span className="text-right text-foreground">{fmtVol(vol)}</span>
          </>
        )}
      </div>
    </div>
  );
}