import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listPopups, upsertPopup, deletePopup, togglePopup } from "@/lib/admin/popups.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_admin/mw-admin/popups")({
  component: AdminPopupsPage,
});

type Field = { name: string; label: string; type: "email" | "text" | "select"; required: boolean; placeholder?: string };
type Theme = { accent: "gold" | "primary" | "down" | "up"; layout: "center" | "bottom" | "side"; animation: "fade" | "slide" | "pop" };
type Targeting = { pages: string[]; delaySeconds: number; scrollPercent: number; frequencyDays: number; hideForSubscribers: boolean };

type PopupForm = {
  id?: string;
  slug: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  body_md: string;
  cta_label: string;
  success_message: string;
  theme: Theme;
  fields: Field[];
  targeting: Targeting;
  topics: string[];
};

const EMPTY: PopupForm = {
  slug: "default",
  enabled: true,
  title: "Bản tin MarketWatch",
  subtitle: "Vàng · Crypto · Ngoại tệ — gói gọn trong 1 email.",
  body_md: "",
  cta_label: "Đăng ký",
  success_message: "Cảm ơn bạn đã đăng ký!",
  theme: { accent: "gold", layout: "center", animation: "fade" },
  fields: [{ name: "email", label: "Email", type: "email", required: true, placeholder: "ban@vidu.com" }],
  targeting: { pages: ["*"], delaySeconds: 25, scrollPercent: 0, frequencyDays: 1, hideForSubscribers: true },
  topics: ["gold", "btc", "usd"],
};

function AdminPopupsPage() {
  const fetchFn = useServerFn(listPopups);
  const upsertFn = useServerFn(upsertPopup);
  const deleteFn = useServerFn(deletePopup);
  const toggleFn = useServerFn(togglePopup);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PopupForm | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin", "popups"], queryFn: () => fetchFn() });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "popups"] });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl">Popup</h1>
          <p className="text-sm text-muted-foreground">Tuỳ chỉnh giao diện, fields và targeting cho newsletter popup.</p>
        </div>
        <Button onClick={() => setEditing(EMPTY)}>+ Tạo popup</Button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}

      <div className="grid gap-3">
        {data?.popups.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant={p.enabled ? "default" : "outline"}>{p.slug}</Badge>
                {!p.enabled && <span className="text-xs text-muted-foreground">tắt</span>}
              </div>
              <div className="mt-1 font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground">{p.subtitle}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                trigger sau {(p.targeting as Targeting).delaySeconds}s · pages: {(p.targeting as Targeting).pages.join(", ")}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                checked={p.enabled}
                onCheckedChange={async (v) => {
                  try { await toggleFn({ data: { id: p.id, enabled: v } }); refresh(); } catch (e) { toast.error((e as Error).message); }
                }}
              />
              <Button size="sm" variant="outline" onClick={() => setEditing({
                id: p.id,
                slug: p.slug, enabled: p.enabled, title: p.title,
                subtitle: p.subtitle ?? "", body_md: p.body_md ?? "",
                cta_label: p.cta_label, success_message: p.success_message,
                theme: p.theme as Theme, fields: p.fields as Field[],
                targeting: p.targeting as Targeting, topics: p.topics as string[],
              })}>Sửa</Button>
              <Button size="sm" variant="destructive" onClick={async () => {
                if (!confirm(`Xoá popup "${p.slug}"?`)) return;
                try { await deleteFn({ data: { id: p.id } }); toast.success("Đã xoá"); refresh(); } catch (e) { toast.error((e as Error).message); }
              }}>Xoá</Button>
            </div>
          </div>
        ))}
        {data && data.popups.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Chưa có popup nào. Bấm "Tạo popup" để bắt đầu.
          </div>
        )}
      </div>

      {editing && (
        <PopupEditor
          value={editing}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            try {
              await upsertFn({ data: form });
              toast.success("Đã lưu");
              setEditing(null);
              refresh();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}

function PopupEditor({ value, onClose, onSave }: { value: PopupForm; onClose: () => void; onSave: (v: PopupForm) => void }) {
  const [f, setF] = useState<PopupForm>(value);
  const set = <K extends keyof PopupForm>(k: K, v: PopupForm[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{value.id ? "Sửa popup" : "Tạo popup"}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Huỷ</Button>
            <Button onClick={() => onSave(f)}>Lưu</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Editor */}
          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slug *</Label>
                <Input value={f.slug} onChange={(e) => set("slug", e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} />
                <Label>Bật</Label>
              </div>
            </div>
            <div>
              <Label>Tiêu đề *</Label>
              <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <Label>Phụ đề</Label>
              <Input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
            <div>
              <Label>Body (Markdown)</Label>
              <Textarea rows={4} value={f.body_md} onChange={(e) => set("body_md", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CTA label *</Label>
                <Input value={f.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
              </div>
              <div>
                <Label>Success message *</Label>
                <Input value={f.success_message} onChange={(e) => set("success_message", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Accent</Label>
                <Select value={f.theme.accent} onValueChange={(v) => set("theme", { ...f.theme, accent: v as Theme["accent"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="up">Up (green)</SelectItem>
                    <SelectItem value="down">Down (red)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Layout</Label>
                <Select value={f.theme.layout} onValueChange={(v) => set("theme", { ...f.theme, layout: v as Theme["layout"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center modal</SelectItem>
                    <SelectItem value="bottom">Bottom sheet</SelectItem>
                    <SelectItem value="side">Side card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Animation</Label>
                <Select value={f.theme.animation} onValueChange={(v) => set("theme", { ...f.theme, animation: v as Theme["animation"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="pop">Pop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Fields (JSON)</Label>
              <Textarea
                rows={6}
                value={JSON.stringify(f.fields, null, 2)}
                onChange={(e) => {
                  try { set("fields", JSON.parse(e.target.value)); } catch {}
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Delay (giây)</Label>
                <Input type="number" value={f.targeting.delaySeconds} onChange={(e) => set("targeting", { ...f.targeting, delaySeconds: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Frequency (ngày)</Label>
                <Input type="number" value={f.targeting.frequencyDays} onChange={(e) => set("targeting", { ...f.targeting, frequencyDays: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Scroll trigger (%)</Label>
                <Input type="number" value={f.targeting.scrollPercent} onChange={(e) => set("targeting", { ...f.targeting, scrollPercent: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={f.targeting.hideForSubscribers} onCheckedChange={(v) => set("targeting", { ...f.targeting, hideForSubscribers: v })} />
                <Label>Ẩn với subscriber</Label>
              </div>
            </div>
            <div>
              <Label>Pages (comma — "*" = mọi trang)</Label>
              <Input
                value={f.targeting.pages.join(", ")}
                onChange={(e) => set("targeting", { ...f.targeting, pages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
            <div>
              <Label>Topics (comma)</Label>
              <Input
                value={f.topics.join(", ")}
                onChange={(e) => set("topics", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
            <PopupPreview form={f} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PopupPreview({ form }: { form: PopupForm }) {
  const accentMap = {
    gold: "var(--gold)",
    primary: "var(--primary)",
    up: "var(--up)",
    down: "var(--down)",
  } as const;
  const accent = accentMap[form.theme.accent];
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-background p-6 shadow-xl" style={{ boxShadow: `0 0 40px -10px color-mix(in oklab, ${accent} 30%, transparent)` }}>
      <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>MarketWatch</div>
      <div className="mt-2 font-display text-xl">{form.title}</div>
      {form.subtitle && <div className="mt-1 text-sm text-muted-foreground">{form.subtitle}</div>}
      {form.body_md && <div className="mt-3 whitespace-pre-wrap text-sm">{form.body_md}</div>}
      <div className="mt-4 space-y-2">
        {form.fields.map((f, i) => (
          <Input key={i} type={f.type === "email" ? "email" : "text"} placeholder={f.placeholder ?? f.label} />
        ))}
      </div>
      <Button className="mt-3 w-full" style={{ background: accent, color: "var(--background)" }}>{form.cta_label}</Button>
      <p className="mt-2 text-xs text-muted-foreground">Animation: {form.theme.animation} · Layout: {form.theme.layout}</p>
    </div>
  );
}