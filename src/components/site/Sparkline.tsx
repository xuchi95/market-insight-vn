interface Props { data: number[]; width?: number; height?: number; }
export function Sparkline({ data, width = 110, height = 32 }: Props) {
  if (!data || data.length < 2) return <div className="h-8 w-[110px]" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  const stroke = up ? "var(--up)" : "var(--down)";
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}