import { Fuel } from "lucide-react";
import { SectionCard } from "./SectionCard";

// Nguồn: Petrolimex — Công văn 3826/BCT-TTTN, áp dụng từ 15h00 ngày 28/05/2026
// Cập nhật thủ công sau mỗi kỳ điều chỉnh (thường thứ Năm hàng tuần).
const EFFECTIVE_FROM = "15:00 — 28/05/2026";
const SOURCE_URL =
  "https://www.petrolimex.com.vn/nd/gia-xang-dau/gia-xang-dau-vung-1.html";

type FuelRow = {
  name: string;
  unit: string;
  zone1: number;
  zone2: number;
  highlight?: boolean;
};

const ROWS: FuelRow[] = [
  { name: "Xăng RON 95-V", unit: "đồng/lít", zone1: 25050, zone2: 25550, highlight: true },
  { name: "Xăng RON 95-III", unit: "đồng/lít", zone1: 24150, zone2: 24630, highlight: true },
  { name: "Xăng E10 RON 95-V", unit: "đồng/lít", zone1: 24560, zone2: 25050 },
  { name: "Xăng E10 RON 95-III", unit: "đồng/lít", zone1: 23660, zone2: 24130 },
  { name: "Xăng E5 RON 92-II", unit: "đồng/lít", zone1: 23250, zone2: 23710, highlight: true },
  { name: "Điêzen 0,001S-V", unit: "đồng/lít", zone1: 28910, zone2: 29480 },
  { name: "Điêzen 0,05S-II", unit: "đồng/lít", zone1: 27650, zone2: 28200, highlight: true },
  { name: "Dầu hỏa 2-K", unit: "đồng/lít", zone1: 25800, zone2: 26310 },
  { name: "Mazút N°2B (3,5S)", unit: "đồng/kg", zone1: 20440, zone2: 20840 },
  { name: "Mazút 180cst - 0,5S (RMG)", unit: "đồng/kg", zone1: 23540, zone2: 24010 },
];

const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export function VnFuelPriceTable() {
  return (
    <SectionCard
      id="vn-fuel"
      icon={<Fuel className="h-4 w-4" />}
      title="Giá xăng dầu trong nước"
      description="Bảng giá bán lẻ Petrolimex — 34 tỉnh thành, đã bao gồm thuế GTGT"
      action={
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Áp dụng từ {EFFECTIVE_FROM}
        </a>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold tracking-wider">Mặt hàng</th>
              <th className="text-left px-4 py-3 font-semibold tracking-wider hidden sm:table-cell">
                Đơn vị
              </th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">Vùng 1</th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">Vùng 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((r) => (
              <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-display text-lg tracking-tight">{r.name}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{r.unit}</div>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                  {r.unit}
                </td>
                <td
                  className={`px-4 py-4 text-right tabular font-display text-xl tracking-tight ${
                    r.highlight ? "text-gold" : ""
                  }`}
                >
                  {fmtVnd(r.zone1)}
                </td>
                <td className="px-4 py-4 text-right tabular font-display text-lg text-muted-foreground">
                  {fmtVnd(r.zone2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border bg-muted/20">
        Vùng 2 áp dụng cho địa bàn xa cảng, xa kho đầu mối, xa cơ sở sản xuất xăng dầu (chi phí
        vận chuyển cao). Giá có thể thay đổi sau mỗi kỳ điều chỉnh (thường thứ Năm hàng tuần) —
        nguồn:{" "}
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Petrolimex
        </a>
        .
      </div>
    </SectionCard>
  );
}