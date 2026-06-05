import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, History, Sparkles, User } from "lucide-react";
import { listFuelHistory } from "@/lib/admin/fuel-prices.functions";

export const Route = createFileRoute("/_admin/mw-admin/fuel-prices_/history")({
  component: AdminFuelHistoryPage,
});

type FuelRow = {
  name: string;
  unit: string;
  zone1: number;
  zone2: number;
  highlight?: boolean;
};

type HistoryItem = {
  id: string;
  effective_from: string;
  source_url: string;
  rows: FuelRow[];
  source: string;
  created_at: string;
  created_by: string | null;
};

const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diffPct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function AdminFuelHistoryPage() {
  const fetchHistory = useServerFn(listFuelHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "fuel-prices", "history"],
    queryFn: () => fetchHistory(),
  });

  const items = (data?.items ?? []) as HistoryItem[];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIndex = useMemo(
    () => items.findIndex((it) => it.id === (selectedId ?? items[0]?.id)),
    [items, selectedId],
  );
  const current = selectedIndex >= 0 ? items[selectedIndex] : null;
  const previous =
    selectedIndex >= 0 && selectedIndex + 1 < items.length
      ? items[selectedIndex + 1]
      : null;

  // Merge rows from current + previous theo name để hiển thị cùng bảng
  const merged = useMemo(() => {
    if (!current) return [];
    const map = new Map<
      string,
      { name: string; unit: string; curr?: FuelRow; prev?: FuelRow }
    >();
    for (const r of current.rows) {
      map.set(r.name, { name: r.name, unit: r.unit, curr: r });
    }
    if (previous) {
      for (const r of previous.rows) {
        const existing = map.get(r.name);
        if (existing) existing.prev = r;
        else map.set(r.name, { name: r.name, unit: r.unit, prev: r });
      }
    }
    return Array.from(map.values());
  }, [current, previous]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-[var(--gold)]" />
            Lịch sử cập nhật giá xăng
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi lần lưu/cập nhật tự động đều ghi lại bản snapshot. Chọn 1 bản ở
            danh sách bên trái để so sánh với bản liền trước.
          </p>
        </div>
        <Link
          to="/mw-admin/fuel-prices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Về trang quản lý giá
        </Link>
      </header>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Đang tải lịch sử…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Chưa có bản ghi nào. Hãy thử cập nhật giá ở trang quản lý.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              {items.length} bản ghi
            </div>
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-border">
              {items.map((it, idx) => {
                const isActive = it.id === (selectedId ?? items[0].id);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(it.id)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/40 ${
                        isActive ? "bg-muted/60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                            it.source === "auto"
                              ? "bg-[color-mix(in_oklab,var(--gold)_18%,transparent)] text-[var(--gold)]"
                              : it.source === "seed"
                                ? "bg-muted text-muted-foreground"
                                : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {it.source === "auto" ? (
                            <Sparkles className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          {it.source === "auto"
                            ? "Auto"
                            : it.source === "seed"
                              ? "Seed"
                              : "Thủ công"}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">
                            Mới nhất
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-medium text-sm">
                        {fmtDateTime(it.created_at)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Áp dụng từ: {it.effective_from}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {it.rows.length} mặt hàng
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            {current && (
              <>
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-medium">
                        Phiên bản {fmtDateTime(current.created_at)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Áp dụng từ: {current.effective_from} · Nguồn:{" "}
                        <a
                          href={current.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                        >
                          link
                        </a>
                      </div>
                    </div>
                    {previous ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        So với{" "}
                        <span className="font-medium text-foreground/80">
                          {fmtDateTime(previous.created_at)}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Đây là bản ghi đầu tiên — không có bản trước để đối chiếu.
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Mặt hàng</th>
                        <th className="text-right px-3 py-2">Vùng 1 (cũ → mới)</th>
                        <th className="text-right px-3 py-2">Vùng 2 (cũ → mới)</th>
                        <th className="text-right px-3 py-2 w-24">Δ %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {merged.map((m) => {
                        const currZ1 = m.curr?.zone1 ?? null;
                        const prevZ1 = m.prev?.zone1 ?? null;
                        const currZ2 = m.curr?.zone2 ?? null;
                        const prevZ2 = m.prev?.zone2 ?? null;
                        const delta =
                          currZ1 != null && prevZ1 != null
                            ? diffPct(currZ1, prevZ1)
                            : null;

                        const status =
                          !m.prev && m.curr
                            ? "new"
                            : !m.curr && m.prev
                              ? "removed"
                              : "same";

                        return (
                          <tr key={m.name} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <div className="font-medium">{m.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {m.unit}
                                {status === "new" && (
                                  <span className="ml-2 text-[10px] uppercase text-[var(--gold)]">
                                    Mới
                                  </span>
                                )}
                                {status === "removed" && (
                                  <span className="ml-2 text-[10px] uppercase text-destructive">
                                    Đã bỏ
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <PriceCompare prev={prevZ1} curr={currZ1} />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <PriceCompare prev={prevZ2} curr={currZ2} />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {delta == null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : delta === 0 ? (
                                <span className="text-muted-foreground">0%</span>
                              ) : (
                                <span
                                  className={
                                    delta > 0 ? "text-destructive" : "text-emerald-500"
                                  }
                                >
                                  {delta > 0 ? "+" : ""}
                                  {delta.toFixed(2)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PriceCompare({ prev, curr }: { prev: number | null; curr: number | null }) {
  if (curr == null) return <span className="text-muted-foreground">—</span>;
  if (prev == null) return <span className="font-medium">{fmtVnd(curr)}</span>;
  if (prev === curr) return <span>{fmtVnd(curr)}</span>;
  return (
    <span>
      <span className="text-muted-foreground line-through mr-1">{fmtVnd(prev)}</span>
      <span
        className={`font-medium ${
          curr > prev ? "text-destructive" : "text-emerald-500"
        }`}
      >
        {fmtVnd(curr)}
      </span>
    </span>
  );
}