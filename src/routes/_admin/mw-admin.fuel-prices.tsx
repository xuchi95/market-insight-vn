import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Save, Trash2, Fuel, History } from "lucide-react";
import {
  getFuelSnapshot,
  saveFuelSnapshot,
  refreshFuelFromPetrolimex,
  type FuelRowInput,
} from "@/lib/admin/fuel-prices.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_admin/mw-admin/fuel-prices")({
  component: AdminFuelPricesPage,
});

type Snapshot = {
  effective_from: string;
  source_url: string;
  rows: FuelRowInput[];
  updated_at?: string;
};

const DEFAULT_SOURCE =
  "https://www.petrolimex.com.vn/nd/gia-xang-dau/gia-xang-dau-vung-1.html";

function AdminFuelPricesPage() {
  const qc = useQueryClient();
  const fetchSnapshot = useServerFn(getFuelSnapshot);
  const save = useServerFn(saveFuelSnapshot);
  const refresh = useServerFn(refreshFuelFromPetrolimex);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "fuel-prices"],
    queryFn: () => fetchSnapshot(),
  });

  const [form, setForm] = useState<Snapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (data && !form) {
      setForm({
        effective_from: data.effective_from,
        source_url: data.source_url,
        rows: (data.rows as FuelRowInput[]) ?? [],
        updated_at: data.updated_at ?? undefined,
      });
    }
  }, [data, form]);

  if (isLoading || !form) {
    return <div className="text-sm text-muted-foreground">Đang tải dữ liệu…</div>;
  }

  const updateRow = (i: number, patch: Partial<FuelRowInput>) => {
    setForm((f) =>
      f ? { ...f, rows: f.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) } : f,
    );
  };

  const addRow = () => {
    setForm((f) =>
      f
        ? {
            ...f,
            rows: [...f.rows, { name: "Mặt hàng mới", unit: "đồng/lít", zone1: 0, zone2: 0 }],
          }
        : f,
    );
  };

  const removeRow = (i: number) => {
    setForm((f) => (f ? { ...f, rows: f.rows.filter((_, idx) => idx !== i) } : f));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await save({
        data: {
          effective_from: form.effective_from,
          source_url: form.source_url,
          rows: form.rows,
        },
      });
      toast.success("Đã lưu bảng giá xăng");
      qc.invalidateQueries({ queryKey: ["admin", "fuel-prices"] });
      qc.invalidateQueries({ queryKey: ["public", "vn-fuel-prices"] });
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
        `Đã cập nhật ${res.rowCount} mặt hàng từ Petrolimex (${res.effective_from})`,
      );
      // Reset form to refetch from server
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin", "fuel-prices"] });
      qc.invalidateQueries({ queryKey: ["public", "vn-fuel-prices"] });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Không cập nhật được. Hãy chỉnh tay rồi Lưu.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Fuel className="h-5 w-5 text-[var(--gold)]" />
            Giá xăng dầu trong nước
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý bảng giá bán lẻ Petrolimex hiển thị trên trang chủ. Nhấn{" "}
            <em>Cập nhật tự động</em> để Lovable AI bóc tách giá mới nhất từ Petrolimex.
          </p>
          {form.updated_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Lần cập nhật cuối: {new Date(form.updated_at).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/mw-admin/fuel-prices/history"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mr-2"
          >
            <History className="h-4 w-4" /> Lịch sử
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoRefresh}
            disabled={refreshing || saving}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Đang lấy giá…" : "Cập nhật tự động từ Petrolimex"}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || refreshing}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 rounded-2xl border border-border bg-card p-4">
        <div>
          <Label htmlFor="effective_from">Áp dụng từ</Label>
          <Input
            id="effective_from"
            value={form.effective_from}
            onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
            placeholder="vd: 15:00 — 28/05/2026"
          />
        </div>
        <div>
          <Label htmlFor="source_url">Link nguồn</Label>
          <Input
            id="source_url"
            value={form.source_url}
            onChange={(e) => setForm({ ...form, source_url: e.target.value })}
            placeholder={DEFAULT_SOURCE}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-medium">Danh sách mặt hàng ({form.rows.length})</h2>
          <Button type="button" variant="ghost" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Thêm mặt hàng
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Mặt hàng</th>
                <th className="text-left px-3 py-2 w-28">Đơn vị</th>
                <th className="text-right px-3 py-2 w-32">Vùng 1</th>
                <th className="text-right px-3 py-2 w-32">Vùng 2</th>
                <th className="text-center px-3 py-2 w-20">Nổi bật</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {form.rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <Input
                      value={r.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={r.unit}
                      onChange={(e) => updateRow(i, { unit: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="text-right tabular-nums"
                      value={r.zone1}
                      onChange={(e) =>
                        updateRow(i, { zone1: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="text-right tabular-nums"
                      value={r.zone2}
                      onChange={(e) =>
                        updateRow(i, { zone2: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={!!r.highlight}
                      onCheckedChange={(v) => updateRow(i, { highlight: v })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}