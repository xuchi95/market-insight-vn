import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getPriceChangeSettings,
  updatePriceChangeSettings,
} from "@/lib/admin/price-settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_admin/mw-admin/price-settings")({
  component: PriceSettingsPage,
});

function PriceSettingsPage() {
  const getFn = useServerFn(getPriceChangeSettings);
  const updateFn = useServerFn(updatePriceChangeSettings);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "price-settings"],
    queryFn: () => getFn(),
  });

  const [enabled, setEnabled] = useState(true);
  const [tolerance, setTolerance] = useState(2);
  const [minAge, setMinAge] = useState(0);
  const [minSamples, setMinSamples] = useState(1);
  const [snapInt, setSnapInt] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = data?.settings;
    if (s) {
      setEnabled(!!s.enabled);
      setTolerance(Number(s.window_tolerance_hours));
      setMinAge(Number(s.min_sample_age_hours));
      setMinSamples(Number(s.min_samples));
      setSnapInt(Number(s.snapshot_min_interval_minutes));
    }
  }, [data?.settings]);

  async function save() {
    setSaving(true);
    try {
      await updateFn({
        data: {
          enabled,
          window_tolerance_hours: tolerance,
          min_sample_age_hours: minAge,
          min_samples: minSamples,
          snapshot_min_interval_minutes: snapInt,
        },
      });
      toast.success("Đã lưu cấu hình. Hiệu lực sau ~60 giây.");
      qc.invalidateQueries({ queryKey: ["admin", "price-settings"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Cấu hình tính % thay đổi giá</h1>
        <p className="text-sm text-muted-foreground">
          Điều chỉnh cửa sổ ±h, tuổi mẫu tối thiểu, số mẫu tối thiểu và tần suất ghi snapshot để
          tính `changePct` cho XAUUSD và vàng trong nước. Thay đổi áp dụng cho mọi instance sau
          khi cache hết hạn (~60 giây).
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">Tham số</h2>
            <p className="text-xs text-muted-foreground">
              Tắt để FE luôn nhận `changePct = 0` (bỏ qua DB lookup).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="enabled" className="text-sm">
              Bật tính %
            </Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Cửa sổ ± (giờ)</Label>
            <Input
              type="number"
              step="0.5"
              min={0}
              max={12}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Cho phép lệch ±h quanh mốc 24h khi chọn mẫu baseline. 0–12 giờ.
            </p>
          </div>
          <div>
            <Label>Tuổi mẫu tối thiểu (giờ)</Label>
            <Input
              type="number"
              step="0.5"
              min={0}
              max={24}
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Bỏ qua mẫu trẻ hơn ngưỡng này (tránh dùng mẫu mới ghi). 0 = tắt.
            </p>
          </div>
          <div>
            <Label>Số mẫu tối thiểu</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={minSamples}
              onChange={(e) => setMinSamples(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Mỗi symbol cần ≥ ngần này mẫu trong cửa sổ thì baseline mới được dùng (vàng).
            </p>
          </div>
          <div>
            <Label>Khoảng ghi snapshot (phút)</Label>
            <Input
              type="number"
              min={1}
              max={1440}
              value={snapInt}
              onChange={(e) => setSnapInt(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Chỉ ghi 1 snapshot / N phút để không phình bảng `price_history`.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save} disabled={saving || isLoading}>
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
          {data?.settings?.updated_at && (
            <span className="text-xs text-muted-foreground">
              Cập nhật lần cuối: {new Date(data.settings.updated_at).toLocaleString("vi-VN")}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}