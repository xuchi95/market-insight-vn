import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { SectionCard } from "@/components/site/SectionCard";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FngPoint { value: number; classification: string; timestamp: number }
interface FngPayload {
  current: FngPoint;
  yesterday?: FngPoint;
  lastWeek?: FngPoint;
  lastMonth?: FngPoint;
  history: FngPoint[];
  fetchedAt: number;
  source: string;
}

async function fetchFng(): Promise<FngPayload> {
  const res = await fetch("/api/public/fear-greed", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const VI: Record<string, string> = {
  "Extreme Fear": "Sợ hãi tột độ",
  "Fear": "Sợ hãi",
  "Neutral": "Trung tính",
  "Greed": "Tham lam",
  "Extreme Greed": "Tham lam tột độ",
};

function colorFor(v: number) {
  if (v < 25) return "#dc2626"; // red
  if (v < 45) return "#f97316"; // orange
  if (v < 55) return "#eab308"; // yellow
  if (v < 75) return "#65a30d"; // lime
  return "#16a34a"; // green
}

function Arc({ value }: { value: number }) {
  // Semi-circle gauge (180deg). value 0..100.
  const angle = (value / 100) * 180 - 90;
  const r = 80;
  const cx = 100;
  const cy = 100;
  const rad = (angle * Math.PI) / 180;
  const needleX = cx + r * Math.sin(rad);
  const needleY = cy - r * Math.cos(rad);
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-[260px]" aria-hidden>
      <defs>
        <linearGradient id="fng-arc" x1="0" x2="1">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="25%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="75%" stopColor="#65a30d" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <path
        d={`M 20 100 A 80 80 0 0 1 180 100`}
        fill="none"
        stroke="url(#fng-arc)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="currentColor" />
    </svg>
  );
}

function HistoryItem({ label, point, current }: { label: string; point?: FngPoint; current: number }) {
  if (!point) return null;
  const diff = current - point.value;
  const Icon = diff >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums" style={{ color: colorFor(point.value) }}>{point.value}</span>
        <span className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", diff >= 0 ? "text-[var(--up)]" : "text-[var(--down)]")}>
          <Icon className="h-3 w-3" />{diff >= 0 ? "+" : ""}{diff}
        </span>
      </div>
    </div>
  );
}

export function FearGreedGauge() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["fear-greed"],
    queryFn: fetchFng,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });

  return (
    <SectionCard
      title="Chỉ số Fear & Greed (Crypto)"
      description="Đo tâm lý thị trường crypto toàn cầu — từ Sợ hãi tột độ (0) đến Tham lam tột độ (100)"
      meta={
        <span className="inline-flex items-center gap-1.5">
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          {data && <>Nguồn: {data.source}</>}
        </span>
      }
    >
      <div className="p-4 lg:p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải…
          </div>
        ) : isError || !data ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-muted-foreground">Không tải được dữ liệu Fear & Greed.</p>
            <button onClick={() => refetch()} className="text-xs text-primary hover:underline">Thử lại</button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
            <div className="flex flex-col items-center">
              <Arc value={data.current.value} />
              <div className="mt-1 text-center">
                <div className="text-4xl font-bold tabular-nums" style={{ color: colorFor(data.current.value) }}>
                  {data.current.value}
                </div>
                <div className="text-sm font-semibold" style={{ color: colorFor(data.current.value) }}>
                  {VI[data.current.classification] ?? data.current.classification}
                </div>
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mt-1">
                  {fmtDate(data.current.timestamp)}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 divide-y divide-border/60">
              <HistoryItem label="Hôm qua" point={data.yesterday} current={data.current.value} />
              <HistoryItem label="Tuần trước" point={data.lastWeek} current={data.current.value} />
              <HistoryItem label="Tháng trước" point={data.lastMonth} current={data.current.value} />
              <div className="pt-2 text-sm text-muted-foreground leading-relaxed">
                Khi thị trường <strong>Sợ hãi tột độ</strong> (giá trị thấp), nhà đầu tư đang quá lo lắng — có thể là cơ hội mua. Khi <strong>Tham lam tột độ</strong>, thị trường có thể đang quá nóng.
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}