import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Save, Eye } from "lucide-react";
import {
  adminGetAdblockSettings,
  updateAdblockSettings,
  type AdblockSettings,
} from "@/lib/admin/adblock.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_admin/mw-admin/adblock")({
  component: AdminAdblockPage,
});

function ColorInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 font-mono text-xs"
        />
      </div>
    </div>
  );
}

function AdminAdblockPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetAdblockSettings);
  const saveFn = useServerFn(updateAdblockSettings);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-adblock-settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<AdblockSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  if (isLoading || !form) {
    return <div className="text-sm text-muted-foreground">Đang tải cấu hình…</div>;
  }

  const update = <K extends keyof AdblockSettings>(k: K, v: AdblockSettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFn({ data: form });
      toast.success("Đã lưu cấu hình chống adblock");
      qc.invalidateQueries({ queryKey: ["adblock-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-adblock-settings"] });
    } catch (e) {
      toast.error((e as Error).message ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  // Live preview swatches
  const previewBg =
    form.theme === "custom" ? form.bg_color
      : form.theme === "light" ? "#fbf7ee"
      : form.theme === "gold" ? "#2a1f0a" : "#1a1a1a";
  const previewText =
    form.theme === "custom" ? form.text_color
      : form.theme === "light" ? "#2a241b"
      : form.theme === "gold" ? "#f0d78c" : "#f5f0df";
  const previewAccent =
    form.theme === "custom" ? form.accent_color
      : form.theme === "light" ? "#8a6a1f" : "#c9a84c";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Shield className="h-6 w-6 text-[var(--gold)]" />
            Chống AdBlock
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phát hiện trình chặn quảng cáo và hiển thị thông báo tuỳ biến.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreview((v) => !v)}>
            <Eye className="mr-2 h-4 w-4" />
            {preview ? "Đóng xem trước" : "Xem trước"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </div>
      </div>

      {/* Master switch */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <Label className="text-base font-semibold">Bật tính năng</Label>
          <p className="text-xs text-muted-foreground">
            Khi tắt, hệ thống hoàn toàn không phát hiện hay hiển thị popup.
          </p>
        </div>
        <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Nội dung</TabsTrigger>
          <TabsTrigger value="appearance">Giao diện</TabsTrigger>
          <TabsTrigger value="behavior">Hành vi</TabsTrigger>
          <TabsTrigger value="detection">Phát hiện</TabsTrigger>
          <TabsTrigger value="advanced">Nâng cao</TabsTrigger>
        </TabsList>

        {/* CONTENT */}
        <TabsContent value="content" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Tiêu đề</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nội dung chính</Label>
              <Textarea
                rows={3}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dòng phụ (tuỳ chọn)</Label>
              <Input
                value={form.secondary_message}
                onChange={(e) => update("secondary_message", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nút chính</Label>
                <Input value={form.button_text} onChange={(e) => update("button_text", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nút bỏ qua</Label>
                <Input value={form.dismiss_text} onChange={(e) => update("dismiss_text", e.target.value)} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Bố cục</Label>
                <Select value={form.layout} onValueChange={(v) => update("layout", v as AdblockSettings["layout"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modal">Modal trung tâm</SelectItem>
                    <SelectItem value="fullscreen">Toàn màn hình</SelectItem>
                    <SelectItem value="banner_top">Banner trên cùng</SelectItem>
                    <SelectItem value="banner_bottom">Banner dưới cùng</SelectItem>
                    <SelectItem value="corner">Góc phải dưới</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Chủ đề màu</Label>
                <Select value={form.theme} onValueChange={(v) => update("theme", v as AdblockSettings["theme"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Tối</SelectItem>
                    <SelectItem value="light">Sáng</SelectItem>
                    <SelectItem value="gold">Vàng (MarketWatch)</SelectItem>
                    <SelectItem value="custom">Tự định nghĩa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bo góc ({form.border_radius}px)</Label>
                <Slider
                  min={0} max={48} step={1} value={[form.border_radius]}
                  onValueChange={([v]) => update("border_radius", v)}
                />
              </div>
            </div>

            {form.theme === "custom" && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <ColorInput label="Nền" value={form.bg_color} onChange={(v) => update("bg_color", v)} />
                <ColorInput label="Chữ" value={form.text_color} onChange={(v) => update("text_color", v)} />
                <ColorInput label="Điểm nhấn" value={form.accent_color} onChange={(v) => update("accent_color", v)} />
                <ColorInput label="Lớp phủ" value={form.overlay_color} onChange={(v) => update("overlay_color", v)} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Độ mờ lớp phủ ({Math.round(form.overlay_opacity * 100)}%)</Label>
                <Slider
                  min={0} max={1} step={0.05} value={[form.overlay_opacity]}
                  onValueChange={([v]) => update("overlay_opacity", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Backdrop blur ({form.backdrop_blur}px)</Label>
                <Slider
                  min={0} max={40} step={1} value={[form.backdrop_blur]}
                  onValueChange={([v]) => update("backdrop_blur", v)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Hiển thị logo</Label>
              <Switch checked={form.show_logo} onCheckedChange={(v) => update("show_logo", v)} />
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Mật độ nội dung</Label>
                <Select
                  value={form.density}
                  onValueChange={(v) => update("density", v as AdblockSettings["density"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Gọn — padding nhỏ, khoảng cách ngắn</SelectItem>
                    <SelectItem value="comfortable">Thoải mái — mặc định</SelectItem>
                    <SelectItem value="spacious">Rộng rãi — padding lớn, thoáng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Cỡ chữ trên desktop ({Math.round(form.font_scale_desktop * 100)}%)
                  </Label>
                  <Slider
                    min={0.75} max={1.5} step={0.05}
                    value={[form.font_scale_desktop]}
                    onValueChange={([v]) => update("font_scale_desktop", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Cỡ chữ trên mobile ({Math.round(form.font_scale_mobile * 100)}%)
                  </Label>
                  <Slider
                    min={0.75} max={1.5} step={0.05}
                    value={[form.font_scale_mobile]}
                    onValueChange={([v]) => update("font_scale_mobile", v)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Cỡ chữ là hệ số nhân áp dụng cho toàn bộ chữ trong popup. Mobile thường nhỏ hơn để tránh tràn.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* BEHAVIOR */}
        <TabsContent value="behavior" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Chế độ chặn</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => {
                  const mode = v as AdblockSettings["mode"];
                  setForm((f) => f && ({
                    ...f,
                    mode,
                    // Tự bật "Cho phép bỏ qua" khi chuyển sang chế độ mềm/trung bình
                    allow_dismiss: mode === "hard" ? f.allow_dismiss : true,
                  }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">Mềm — chỉ nhắc, không chặn</SelectItem>
                  <SelectItem value="dismiss">Trung bình — modal nhưng cho bỏ qua</SelectItem>
                  <SelectItem value="hard">Cứng — KHOÁ trang cho đến khi tắt adblock</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Chế độ "cứng" có thể ảnh hưởng UX và SEO; cân nhắc kỹ trước khi bật.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Cho phép bỏ qua</Label>
                <p className="text-xs text-muted-foreground">Hiển thị nút bỏ qua (không áp dụng cho chế độ cứng).</p>
              </div>
              <Switch checked={form.allow_dismiss} onCheckedChange={(v) => update("allow_dismiss", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Hiển thị nút "Đã tắt — Tiếp tục"</Label>
                <p className="text-xs text-muted-foreground">Cho user kiểm tra lại sau khi tắt extension.</p>
              </div>
              <Switch checked={form.show_retry} onCheckedChange={(v) => update("show_retry", v)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cooldown bỏ qua (giờ): {form.dismiss_cooldown_hours}</Label>
                <Slider
                  min={0} max={168} step={1} value={[form.dismiss_cooldown_hours]}
                  onValueChange={([v]) => update("dismiss_cooldown_hours", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kiểm tra lại định kỳ (giây): {form.recheck_interval_sec}</Label>
                <Slider
                  min={0} max={300} step={5} value={[form.recheck_interval_sec]}
                  onValueChange={([v]) => update("recheck_interval_sec", v)}
                />
                <p className="text-xs text-muted-foreground">0 = chỉ kiểm tra 1 lần khi tải trang.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* DETECTION */}
        <TabsContent value="detection" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Bật ít nhất 1 phương pháp. Càng nhiều phương pháp ⇒ phát hiện chính xác hơn nhưng dễ false-positive với một số extension privacy.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <Label>Bait DOM (.adsbox)</Label>
                <p className="text-xs text-muted-foreground">Chèn div mồi và kiểm tra CSS có bị ẩn không. Hiệu quả với hầu hết adblocker.</p>
              </div>
              <Switch checked={form.detection_bait} onCheckedChange={(v) => update("detection_bait", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Fetch network</Label>
                <p className="text-xs text-muted-foreground">Thử fetch URL adsense/ads.js — bị chặn ⇒ adblock active.</p>
              </div>
              <Switch checked={form.detection_fetch} onCheckedChange={(v) => update("detection_fetch", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Script global (adsbygoogle)</Label>
                <p className="text-xs text-muted-foreground">Kiểm tra window.adsbygoogle có tồn tại sau khi load script không.</p>
              </div>
              <Switch checked={form.detection_script} onCheckedChange={(v) => update("detection_script", v)} />
            </div>
          </div>
        </TabsContent>

        {/* ADVANCED */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Whitelist đường dẫn (mỗi dòng 1 path, kết thúc bằng * cho prefix)</Label>
              <Textarea
                rows={4}
                value={form.whitelist_paths.join("\n")}
                onChange={(e) =>
                  update("whitelist_paths", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
                }
                placeholder="/embed/*&#10;/api/*&#10;/lien-he"
              />
              <p className="text-xs text-muted-foreground">
                Các trang này sẽ KHÔNG hiển thị popup chống adblock.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* PREVIEW */}
      {preview && (
        <div className="rounded-lg border-2 border-dashed border-[var(--gold)]/50 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
            Xem trước
          </div>
          <div
            className="mx-auto flex max-w-[480px] flex-col gap-3 p-7"
            style={{
              background: previewBg,
              color: previewText,
              borderRadius: form.border_radius,
              border: `1px solid ${previewAccent}55`,
            }}
          >
            {form.show_logo && (
              <div
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `linear-gradient(135deg, ${previewAccent}, ${previewAccent}88)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: previewBg,
                }}
              >M</div>
            )}
            <h3 style={{ margin: 0, color: previewAccent, fontWeight: 700, fontSize: 19 }}>
              {form.title}
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>{form.message}</p>
            {form.secondary_message && (
              <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{form.secondary_message}</p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {form.show_retry && (
                <button
                  style={{
                    background: previewAccent, color: previewBg, border: "none",
                    padding: "10px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, flex: 1,
                  }}
                >{form.button_text}</button>
              )}
              {form.allow_dismiss && form.mode !== "hard" && (
                <button
                  style={{
                    background: "transparent", color: previewText,
                    border: `1px solid ${previewText}33`,
                    padding: "10px 16px", borderRadius: 8, fontSize: 13,
                  }}
                >{form.dismiss_text || "Bỏ qua"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}