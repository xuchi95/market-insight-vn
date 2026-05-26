import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LCIcon, Loader2, ZoomOut } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/lib/format";

type Range = "1" | "7" | "30";

interface Point { t: number; v: number }

export interface PairChartAsset {
  key: string;
  kind: "crypto" | "forex" | "gold";
  rateVnd: number;
  /** code hiển thị, vd "USD", "BTC", "PNJ" */
  code: string;
}

interface HistoryResp {
  from: string;
  to: string;
  days: number;
  points: Point[];
  source?: string;
  error?: string;
}

async function fetchPairHistory(from: string, to: string, days: Range): Promise<HistoryResp> {
  const u = `/api/public/pair-history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&days=${days}`;
  const r = await fetch(u, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function ConverterPairChart({ from, to }: { from: PairChartAsset | null; to: PairChartAsset | null }) {
  const [range, setRange] = useState<Range>("7");

  const ready = !!(from && to && from.key !== to.key);
  const ratio = ready ? from!.rateVnd / to!.rateVnd : 0;
  const pairKey = ready ? `${from!.key}>${to!.key}` : "";

  const query = useQuery({
    queryKey: ["pair-history", from?.key, to?.key, range],
    queryFn: () => fetchPairHistory(from!.key, to!.key, range),
    enabled: ready,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const data: Point[] = useMemo(() => {
    const pts = query.data?.points ?? [];
    if (!pts.length || !ready) return pts;
    // Đính kèm giá hiện tại vào cuối để khớp với phần "1 X = Y" đang hiển thị bên trên.
    const last = pts[pts.length - 1];
    if (Math.abs(last.v - ratio) / ratio < 0.0005) return pts;
    return [...pts, { t: Date.now(), v: ratio }];
  }, [query.data, ready, ratio]);

  // ----- Drag-to-zoom state -----
  const [zoom, setZoom] = useState<{ from: number; to: number } | null>(null);
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const [dragRight, setDragRight] = useState<number | null>(null);

  // Reset zoom khi đổi cặp tiền hoặc khung thời gian.
  useEffect(() => {
    setZoom(null);
    setDragLeft(null);
    setDragRight(null);
  }, [pairKey, range]);

  const visibleData = useMemo(() => {
    if (!zoom || !data.length) return data;
    const [lo, hi] = zoom.from <= zoom.to ? [zoom.from, zoom.to] : [zoom.to, zoom.from];
    return data.filter((p) => p.t >= lo && p.t <= hi);
  }, [data, zoom]);

  const stats = useMemo(() => {
    if (!visibleData.length) return null;
    const first = visibleData[0].v;
    const last = visibleData[visibleData.length - 1].v;
    let min = visibleData[0].v, max = visibleData[0].v;
    for (const d of visibleData) { if (d.v < min) min = d.v; if (d.v > max) max = d.v; }
    return { first, last, min, max, change: ((last - first) / first) * 100 };
  }, [visibleData]);

  const commitZoom = () => {
    if (dragLeft == null || dragRight == null || dragLeft === dragRight) {
      setDragLeft(null);
      setDragRight(null);
      return;
    }
    const [lo, hi] = dragLeft < dragRight ? [dragLeft, dragRight] : [dragRight, dragLeft];
    // Chỉ zoom nếu khoảng chọn có ít nhất 2 điểm dữ liệu.
    const inside = data.filter((p) => p.t >= lo && p.t <= hi);
    if (inside.length >= 2) {
      setZoom({ from: lo, to: hi });
    }
    setDragLeft(null);
    setDragRight(null);
  };

  const positive = (stats?.change ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";

  const refVal = stats?.last ?? ratio;
  const dp = refVal === 0 ? 4 : refVal >= 1000 ? 0 : refVal >= 1 ? 4 : 8;
  const fmtVal = (v: number) => fmtNum(v, dp);

  if (!ready) {
    return (
      <div className="rounded-xl border bg-card/40 p-4 text-sm text-muted-foreground">
        Chọn hai loại tiền khác nhau để xem biểu đồ biến động.
      </div>
    );
  }

  const rangeLabel = range === "1" ? "24h" : range === "7" ? "7 ngày" : "30 ngày";
  const source = query.data?.source;
  const isLoading = query.isLoading || query.isFetching;
  const hasError = !!query.error || (query.data && !query.data.points?.length);
  const zoomedLabel = zoom
    ? `${new Date(Math.min(zoom.from, zoom.to)).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} → ${new Date(Math.max(zoom.from, zoom.to)).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div className="rounded-xl border bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <LCIcon className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Biến động {from!.code}/{to!.code}</div>
            <div className="text-[11px] text-muted-foreground">
              Xu hướng tỷ giá {rangeLabel}
              {source ? <> — Nguồn: {source}</> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {zoom && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs gap-1"
              onClick={() => setZoom(null)}
              aria-label="Bỏ zoom"
            >
              <ZoomOut className="h-3.5 w-3.5" /> Bỏ zoom
            </Button>
          )}
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className="h-8">
              <TabsTrigger value="1" className="text-xs px-2">24h</TabsTrigger>
              <TabsTrigger value="7" className="text-xs px-2">7N</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-2">30N</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {zoomedLabel && (
        <div className="px-4 pt-2 text-[11px] text-primary tabular">
          Đang xem: {zoomedLabel}
        </div>
      )}
      {stats && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1 px-4 pt-3">
          <div>
            <div className="text-[11px] text-muted-foreground">1 {from!.code} =</div>
            <div className="text-lg font-bold tabular tracking-tight">{fmtVal(stats.last)} <span className="text-xs text-muted-foreground font-semibold">{to!.code}</span></div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Thay đổi {rangeLabel}</div>
            <div className="text-sm font-semibold tabular" style={{ color }}>{positive ? "+" : ""}{stats.change.toFixed(2)}%</div>
          </div>
          <div className="text-[11px] text-muted-foreground tabular">
            <div>Cao: {fmtVal(stats.max)}</div>
            <div>Thấp: {fmtVal(stats.min)}</div>
          </div>
        </div>
      )}
      <div className="h-48 w-full px-2 pb-2 pt-2 relative select-none">
        {isLoading && !data.length && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu lịch sử…
          </div>
        )}
        {!isLoading && hasError && !data.length && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
            Không có dữ liệu lịch sử cho cặp này ở khung {rangeLabel}.
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={visibleData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onMouseDown={(e: any) => {
              if (e?.activeLabel != null) setDragLeft(Number(e.activeLabel));
              setDragRight(null);
            }}
            onMouseMove={(e: any) => {
              if (dragLeft != null && e?.activeLabel != null) setDragRight(Number(e.activeLabel));
            }}
            onMouseUp={commitZoom}
            onMouseLeave={() => {
              if (dragLeft != null) commitZoom();
            }}
            style={{ cursor: dragLeft != null ? "ew-resize" : "crosshair" }}
          >
            <defs>
              <linearGradient id={`pairFill-${pairKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) =>
                (zoom ? Math.abs(zoom.to - zoom.from) : range === "1" ? 86400_000 : range === "7" ? 7 * 86400_000 : 30 * 86400_000) <= 2 * 86400_000
                  ? new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                  : new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
              }
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              dataKey="v"
              tickFormatter={fmtVal}
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={64}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
              labelFormatter={(t) => new Date(t as number).toLocaleString("vi-VN")}
              formatter={(v: number) => [`${fmtVal(v)} ${to!.code}`, `1 ${from!.code}`]}
            />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#pairFill-${pairKey})`} />
            {dragLeft != null && dragRight != null && (
              <ReferenceArea x1={dragLeft} x2={dragRight} strokeOpacity={0.3} fill="var(--primary)" fillOpacity={0.15} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-3 text-[11px] text-muted-foreground">
        Mẹo: kéo chuột (hoặc chạm và kéo) trên biểu đồ để phóng to một khoảng — bấm <em>Bỏ zoom</em> để xem toàn bộ.
      </div>
    </div>
  );
}