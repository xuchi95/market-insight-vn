import { Fuel, Clock, MapPin, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "./SectionCard";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SOURCE_URL =
  "https://www.petrolimex.com.vn/nd/gia-xang-dau/gia-xang-dau-vung-1.html";

type FuelRow = {
  name: string;
  unit: string;
  zone1: number;
  zone2: number;
  highlight?: boolean;
};

type Snapshot = {
  effective_from: string;
  source_url: string;
  rows: FuelRow[];
};

const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

/**
 * Parse `effective_from` strings such as "15:00 ngày 25/06/2026" hoặc
 * "25/06/2026 15:00" thành { time, date }. Nếu không match, trả về nguyên text.
 */
function parseEffectiveFrom(raw: string): { time?: string; date?: string; raw: string } {
  const s = raw.trim();
  // dạng "HH:mm ngày dd/mm/yyyy"
  const m1 = s.match(/(\d{1,2}:\d{2})\s*(?:ngày\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (m1) return { time: m1[1], date: m1[2], raw: s };
  // dạng "dd/mm/yyyy HH:mm"
  const m2 = s.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})/);
  if (m2) return { time: m2[2], date: m2[1], raw: s };
  // chỉ ngày
  const m3 = s.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (m3) return { date: m3[1], raw: s };
  return { raw: s };
}

export function VnFuelPriceTable() {
  const { data } = useQuery<Snapshot | null>({
    queryKey: ["public", "vn-fuel-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vn_fuel_prices_snapshot")
        .select("effective_from, source_url, rows")
        .eq("id", "latest")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        effective_from: data.effective_from,
        source_url: data.source_url,
        rows: (data.rows as unknown as FuelRow[]) ?? [],
      };
    },
    staleTime: 60_000,
  });

  const rows = data?.rows ?? [];
  const effectiveFrom = data?.effective_from ?? "—";
  const sourceUrl = data?.source_url ?? DEFAULT_SOURCE_URL;
  const eff = parseEffectiveFrom(effectiveFrom);

  return (
    <SectionCard
      id="vn-fuel"
      icon={<Fuel className="h-4 w-4" />}
      title="Giá xăng dầu trong nước"
      action={
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Nguồn Petrolimex <ExternalLink className="h-3 w-3" />
        </a>
      }
    >
      {/* Banner hiệu lực — nổi bật thời điểm áp dụng */}
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-gold/10 via-gold/5 to-transparent">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <div className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold" />
            <span className="text-muted-foreground">Hiệu lực từ</span>
            <span className="font-display tracking-tight text-foreground">
              {eff.time ? (
                <>
                  <span className="tabular text-gold">{eff.time}</span>
                  {eff.date && <> · <span className="tabular">{eff.date}</span></>}
                </>
              ) : (
                <span className="tabular">{eff.raw}</span>
              )}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Niêm yết Petrolimex · Vùng 1 & Vùng 2</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold tracking-wider">Mặt hàng</th>
              <th className="text-left px-4 py-3 font-semibold tracking-wider hidden sm:table-cell">
                Đơn vị
              </th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">
                Vùng 1
                <div className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                  Niêm yết Petrolimex
                </div>
              </th>
              <th className="text-right px-4 py-3 font-semibold tracking-wider">
                Vùng 2
                <div className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                  Địa bàn xa kho
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="font-display text-lg tracking-tight">{r.name}</div>
                    {r.highlight && (
                      <span className="rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                        Phổ biến
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground sm:hidden">{r.unit}</div>
                  {eff.date && (
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      Áp dụng {eff.time ? `${eff.time} · ` : ""}{eff.date}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                  {r.unit}
                </td>
                <td className="px-4 py-4 text-right">
                  <div
                    className={`tabular font-display text-xl tracking-tight ${
                      r.highlight ? "text-gold" : ""
                    }`}
                  >
                    {fmtVnd(r.zone1)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    đồng / {r.unit.replace(/^đồng\s*\/\s*/i, "")}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="tabular font-display text-lg text-muted-foreground">
                    {fmtVnd(r.zone2)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    chênh +{fmtVnd(Math.max(0, r.zone2 - r.zone1))}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu giá xăng. Vui lòng cập nhật từ trang quản trị.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border bg-muted/20">
        Vùng 2 áp dụng cho địa bàn xa cảng, xa kho đầu mối, xa cơ sở sản xuất xăng dầu (chi phí
        vận chuyển cao). Giá có thể thay đổi sau mỗi kỳ điều chỉnh (thường thứ Năm hàng tuần) —
        nguồn:{" "}
        <a
          href={sourceUrl}
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