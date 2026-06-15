import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Save, Trash2, Landmark, Search } from "lucide-react";
import {
  getSavingsSnapshot,
  saveSavingsSnapshot,
  refreshSavingsFromTcb,
  type SavingsRateInput,
} from "@/lib/admin/savings-rates.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_admin/mw-admin/savings-rates")({
  component: AdminSavingsRatesPage,
});

type Tenor = "m1" | "m3" | "m6" | "m9" | "m12" | "m13" | "m18" | "m24" | "m36";

const TENORS: { key: Tenor; label: string }[] = [
  { key: "m1", label: "1T" },
  { key: "m3", label: "3T" },
  { key: "m6", label: "6T" },
  { key: "m9", label: "9T" },
  { key: "m12", label: "12T" },
  { key: "m13", label: "13T" },
  { key: "m18", label: "18T" },
  { key: "m24", label: "24T" },
  { key: "m36", label: "36T" },
];

const GROUPS: SavingsRateInput["group"][] = ["SOCB", "Joint-Stock", "Foreign"];

type FormState = {
  items: SavingsRateInput[];
  sourceDate: string;
  source: string;
  updated_at: string | null;
};

function AdminSavingsRatesPage() {
  const qc = useQueryClient();
  const fetchSnapshot = useServerFn(getSavingsSnapshot);
  const save = useServerFn(saveSavingsSnapshot);
  const refresh = useServerFn(refreshSavingsFromTcb);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "savings-rates"],
    queryFn: () => fetchSnapshot(),
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (data && !form) {
      setForm({
        items: (data.items ?? []).map((i) => ({
          bank: i.bank,
          shortName: i.shortName,
          group: i.group,
          rates: { ...i.rates },
        })) as SavingsRateInput[],
        sourceDate: data.sourceDate ?? "",
        source: data.source ?? "Biên tập viên",
        updated_at: data.updated_at ?? null,
      });
    }
  }, [data, form]);

  const visibleIdx = useMemo(() => {
    if (!form) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return form.items.map((_, i) => i);
    return form.items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) =>
        `${it.bank} ${it.shortName}`.toLowerCase().includes(q),
      )
      .map(({ i }) => i);
  }, [form, filter]);

  if (isLoading || !form) {
    return <div className="text-sm text-muted-foreground">Đang tải dữ liệu…</div>;
  }

  const updateItem = (idx: number, patch: Partial<SavingsRateInput>) => {
    setForm((f) =>
      f
        ? { ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }
        : f,
    );
  };

  const updateRate = (idx: number, key: Tenor, value: string) => {
    setForm((f) => {
      if (!f) return f;
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const rates = { ...it.rates };
        if (value.trim() === "") {
          delete rates[key];
        } else {
          const n = Number(value);
          if (Number.isFinite(n)) rates[key] = n;
        }
        return { ...it, rates };
      });
      return { ...f, items };
    });
  };

  const addRow = () => {
    setForm((f) =>
      f
        ? {
            ...f,
            items: [
              ...f.items,
              { bank: "Ngân hàng mới", shortName: "NEW", group: "Joint-Stock", rates: {} },
            ],
          }
        : f,
    );
  };

  const removeRow = (idx: number) => {
    setForm((f) => (f ? { ...f, items: f.items.filter((_, i) => i !== idx) } : f));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await save({
        data: {
          items: form.items,
          sourceDate: form.sourceDate || null,
          source: form.source || "Biên tập viên",
        },
      });
      toast.success(`Đã lưu ${res.count} ngân hàng`);
      qc.invalidateQueries({ queryKey: ["admin", "savings-rates"] });
      qc.invalidateQueries({ queryKey: ["public", "savings-rates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refresh({});
      toast.success(
        `Đã cập nhật ${res.count} ngân hàng từ Techcombank${res.sourceDate ? ` (${res.sourceDate})` : ""}`,
      );
      setForm({
        items: res.items.map((i) => ({
          bank: i.bank,
          shortName: i.shortName,
          group: i.group,
          rates: { ...i.rates },
        })) as SavingsRateInput[],
        sourceDate: res.sourceDate ?? "",
        source: "Techcombank blog",
        updated_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["admin", "savings-rates"] });
      qc.invalidateQueries({ queryKey: ["public", "savings-rates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tự cập nhật được. Hãy chỉnh tay rồi Lưu.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Landmark className="h-5 w-5 text-[var(--gold)]" />
            Lãi suất tiết kiệm ngân hàng
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý bảng lãi suất hiển thị tại trang{" "}
            <code className="text-foreground">/lai-suat-tiet-kiem</code>. Nhấn{" "}
            <em>Cập nhật tự động</em> để bóc tách từ blog Techcombank, hoặc chỉnh tay rồi{" "}
            <em>Lưu</em>.
          </p>
          {form.updated_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Cập nhật cuối: {new Date(form.updated_at).toLocaleString("vi-VN")} · Nguồn:{" "}
              {form.source}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoRefresh}
            disabled={refreshing || saving}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Đang lấy dữ liệu…" : "Cập nhật từ Techcombank"}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || refreshing}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 rounded-2xl border border-border bg-card p-4">
        <div>
          <Label htmlFor="sourceDate">Ngày tham chiếu (sourceDate)</Label>
          <Input
            id="sourceDate"
            value={form.sourceDate}
            onChange={(e) => setForm({ ...form, sourceDate: e.target.value })}
            placeholder="vd: 2026-06-15"
          />
        </div>
        <div>
          <Label htmlFor="source">Nguồn hiển thị</Label>
          <Input
            id="source"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="vd: Techcombank blog"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <h2 className="font-medium">
            Danh sách ngân hàng ({form.items.length})
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Tìm ngân hàng…"
                className="h-8 pl-8 w-48"
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Thêm
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 w-44">Ngân hàng</th>
                <th className="text-left px-2 py-2 w-20">Mã</th>
                <th className="text-left px-2 py-2 w-28">Nhóm</th>
                {TENORS.map((t) => (
                  <th key={t.key} className="text-right px-2 py-2 w-16">
                    {t.label}
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleIdx.map((i) => {
                const it = form.items[i];
                return (
                  <tr key={i}>
                    <td className="px-3 py-1.5">
                      <Input
                        value={it.bank}
                        onChange={(e) => updateItem(i, { bank: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={it.shortName}
                        onChange={(e) => updateItem(i, { shortName: e.target.value })}
                        className="h-8 w-16 uppercase"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={it.group}
                        onChange={(e) =>
                          updateItem(i, { group: e.target.value as SavingsRateInput["group"] })
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </td>
                    {TENORS.map((t) => (
                      <td key={t.key} className="px-1 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={
                            it.rates[t.key] !== undefined ? String(it.rates[t.key]) : ""
                          }
                          onChange={(e) => updateRate(i, t.key, e.target.value)}
                          className="h-8 text-right tabular-nums px-1.5"
                          placeholder="—"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {visibleIdx.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + TENORS.length + 1}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    Không có ngân hàng nào khớp với "{filter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
          Đơn vị: % / năm. Bỏ trống ô để ẩn kỳ hạn tương ứng.
        </div>
      </section>
    </div>
  );
}