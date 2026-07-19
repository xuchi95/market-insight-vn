import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Coins, Plus, Save, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import {
  listGoldOverrides,
  upsertGoldOverride,
  deleteGoldOverride,
  GOLD_OVERRIDE_CATALOG,
} from "@/lib/admin/gold-overrides.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_admin/mw-admin/gold-overrides")({
  component: AdminGoldOverridesPage,
});

function AdminGoldOverridesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listGoldOverrides);
  const upsert = useServerFn(upsertGoldOverride);
  const remove = useServerFn(deleteGoldOverride);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "gold-overrides"],
    queryFn: () => list(),
  });

  const catalog = data?.catalog ?? GOLD_OVERRIDE_CATALOG;
  const rows = data?.items ?? [];
  const rowByGoldId = useMemo(() => {
    const m = new Map<string, (typeof rows)[number]>();
    for (const r of rows) m.set(r.gold_id, r);
    return m;
  }, [rows]);

  const [form, setForm] = useState<{
    gold_id: string;
    buy: string;
    sell: string;
    note: string;
    expires_at: string;
  }>({ gold_id: catalog[0]?.id ?? "", buy: "", sell: "", note: "", expires_at: "" });

  const activeCatalogItem = catalog.find((c) => c.id === form.gold_id);

  const mSave = useMutation({
    mutationFn: async () => {
      if (!activeCatalogItem) throw new Error("Chưa chọn loại vàng");
      const buy = Math.round(Number(form.buy));
      const sell = Math.round(Number(form.sell));
      if (!Number.isFinite(buy) || !Number.isFinite(sell)) throw new Error("Giá không hợp lệ");
      await upsert({
        data: {
          gold_id: form.gold_id,
          brand: activeCatalogItem.brand,
          type: activeCatalogItem.type,
          buy,
          sell,
          unit: "VND/chỉ",
          note: form.note.trim() || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Đã lưu override — cache 30s sẽ tự cập nhật");
      setForm((f) => ({ ...f, buy: "", sell: "", note: "" }));
      qc.invalidateQueries({ queryKey: ["admin", "gold-overrides"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mDelete = useMutation({
    mutationFn: async (gold_id: string) => {
      await remove({ data: { gold_id } });
    },
    onSuccess: () => {
      toast.success("Đã xoá override");
      qc.invalidateQueries({ queryKey: ["admin", "gold-overrides"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Coins className="h-6 w-6 text-gold" />
            Ghi đè giá vàng thủ công
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Khi upstream PNJ/BTMC lệch giá niêm yết thực tế (ví dụ giá SJC), admin có thể ghi đè theo từng loại. Cache API công khai làm mới sau ~30 giây.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Tải lại
        </Button>
      </header>

      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Thêm / cập nhật</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Loại vàng</Label>
            <select
              value={form.gold_id}
              onChange={(e) => setForm((f) => ({ ...f, gold_id: e.target.value }))}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} — {c.type}
                </option>
              ))}
            </select>
            {rowByGoldId.has(form.gold_id) && (
              <p className="text-xs text-muted-foreground">
                Hiện có override: mua {fmtNum(rowByGoldId.get(form.gold_id)!.buy)} / bán {fmtNum(rowByGoldId.get(form.gold_id)!.sell)} VND/chỉ
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Giá mua (VND/chỉ)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.buy}
                onChange={(e) => setForm((f) => ({ ...f, buy: e.target.value }))}
                placeholder="Ví dụ: 14450000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Giá bán (VND/chỉ)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.sell}
                onChange={(e) => setForm((f) => ({ ...f, sell: e.target.value }))}
                placeholder="Ví dụ: 14750000"
              />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Ghi chú (tuỳ chọn)</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Nguồn / lý do ghi đè…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hết hiệu lực (tuỳ chọn)</Label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Sau thời điểm này, hệ thống tự trả lại giá upstream.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => mSave.mutate()} disabled={mSave.isPending}>
            {mSave.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu override
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Override đang có ({rows.length})
          </h2>
          {rows.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Override sẽ đè lên giá thu về từ PNJ/BTMC.
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Loại</th>
                <th className="text-right px-4 py-3">Mua</th>
                <th className="text-right px-4 py-3">Bán</th>
                <th className="text-left px-4 py-3">Ghi chú</th>
                <th className="text-left px-4 py-3">Hết hạn</th>
                <th className="text-right px-4 py-3">Cập nhật</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Đang tải…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Chưa có override nào — giá đang lấy 100% từ upstream.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.gold_id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.brand}</div>
                    <div className="text-xs text-muted-foreground">{r.type}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{r.gold_id}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{fmtNum(r.buy)}</td>
                  <td className="px-4 py-3 text-right tabular">{fmtNum(r.sell)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.note ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.expires_at ? new Date(r.expires_at).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(r.updated_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => mDelete.mutate(r.gold_id)}
                      disabled={mDelete.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
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