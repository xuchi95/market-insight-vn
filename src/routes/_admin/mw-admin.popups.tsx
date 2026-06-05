import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Bell, Mail, Plus, Trash2, X } from "lucide-react";
import { listPopups, upsertPopup, deletePopup, togglePopup } from "@/lib/admin/popups.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

type Field = {
  name: string;
  label: string;
  type: "email" | "text" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[];
};
type Theme = {
  accent: "gold" | "primary" | "down" | "up";
  layout: "center" | "bottom" | "side";
  animation: "fade" | "slide" | "pop";
  icon?: string;
};
type Targeting = {
  pages: string[];
  delaySeconds: number;
  scrollPercent: number;
  frequencyDays: number;
  hideForSubscribers: boolean;
  authDelaySeconds?: number;
  authFrequencyDays?: number;
};

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
  starts_at?: string | null;
  ends_at?: string | null;
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
  starts_at: null,
  ends_at: null,
};

const TOPIC_SUGGESTIONS = ["gold", "btc", "eth", "usd", "eur", "jpy", "stocks", "us-stocks", "metals", "savings", "macro"];

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
                starts_at: (p as { starts_at?: string | null }).starts_at ?? null,
                ends_at: (p as { ends_at?: string | null }).ends_at ?? null,
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

// ───────────────────────── Editor ─────────────────────────

function PopupEditor({ value, onClose, onSave }: { value: PopupForm; onClose: () => void; onSave: (v: PopupForm) => void }) {
  const [f, setF] = useState<PopupForm>(value);
  const set = <K extends keyof PopupForm>(k: K, v: PopupForm[K]) => setF((p) => ({ ...p, [k]: v }));

  // Ctrl/Cmd+S → save, Esc → close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave(f);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [f, onClose, onSave]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">{value.id ? "Sửa popup" : "Tạo popup"}</h2>
            <p className="text-xs text-muted-foreground">
              ⌘/Ctrl+S để lưu · Esc để huỷ · Mọi thay đổi đều được phản ánh ngay ở preview
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Huỷ</Button>
            <Button onClick={() => onSave(f)}>Lưu</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Editor — tabs */}
          <div className="rounded-lg border border-border bg-card p-5">
            <Tabs defaultValue="content">
              <TabsList className="mb-4 grid w-full grid-cols-4">
                <TabsTrigger value="content">Nội dung</TabsTrigger>
                <TabsTrigger value="design">Giao diện</TabsTrigger>
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="targeting">Targeting</TabsTrigger>
              </TabsList>

              {/* Nội dung */}
              <TabsContent value="content" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Slug *</Label>
                    <Input value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="default-newsletter" />
                  </div>
                  <div className="flex items-end gap-2">
                    <Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} />
                    <Label>{f.enabled ? "Bật" : "Tắt"}</Label>
                  </div>
                </div>
                <div>
                  <Label>Tiêu đề *</Label>
                  <Input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
                  <Counter v={f.title} max={160} />
                </div>
                <div>
                  <Label>Phụ đề</Label>
                  <Input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={240} />
                  <Counter v={f.subtitle} max={240} />
                </div>
                <div>
                  <Label>Body (Markdown / nhiều dòng)</Label>
                  <Textarea rows={5} value={f.body_md} onChange={(e) => set("body_md", e.target.value)} maxLength={2000} />
                  <Counter v={f.body_md} max={2000} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CTA label *</Label>
                    <Input value={f.cta_label} onChange={(e) => set("cta_label", e.target.value)} maxLength={60} />
                  </div>
                  <div>
                    <Label>Thông báo thành công *</Label>
                    <Input value={f.success_message} onChange={(e) => set("success_message", e.target.value)} maxLength={240} />
                  </div>
                </div>
                <div>
                  <Label>Topics (gắn vào subscriber khi đăng ký)</Label>
                  <ChipsInput
                    value={f.topics}
                    onChange={(v) => set("topics", v)}
                    suggestions={TOPIC_SUGGESTIONS}
                    placeholder="Nhập rồi Enter…"
                  />
                </div>
              </TabsContent>

              {/* Giao diện */}
              <TabsContent value="design" className="space-y-4">
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
                        <SelectItem value="side">Side card (góc phải)</SelectItem>
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
                  <Label>Icon (tên lucide, vd: bell, sparkles, mail)</Label>
                  <Input
                    value={f.theme.icon ?? ""}
                    onChange={(e) => set("theme", { ...f.theme, icon: e.target.value || undefined })}
                    placeholder="bell"
                    maxLength={30}
                  />
                </div>
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  💡 Mẹo: kết hợp accent <b>gold</b> + layout <b>side</b> + animation <b>slide</b> cho trải nghiệm
                  ít phiền nhiễu trên trang nội dung dài.
                </div>
              </TabsContent>

              {/* Fields editor */}
              <TabsContent value="fields" className="space-y-3">
                {f.fields.map((field, idx) => (
                  <FieldRow
                    key={idx}
                    field={field}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < f.fields.length - 1}
                    onChange={(nv) => set("fields", f.fields.map((x, i) => (i === idx ? nv : x)))}
                    onRemove={() => f.fields.length > 1 && set("fields", f.fields.filter((_, i) => i !== idx))}
                    onUp={() => {
                      const a = [...f.fields];
                      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                      set("fields", a);
                    }}
                    onDown={() => {
                      const a = [...f.fields];
                      [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]];
                      set("fields", a);
                    }}
                  />
                ))}
                {f.fields.length < 8 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set("fields", [...f.fields, { name: `field_${f.fields.length + 1}`, label: "Trường mới", type: "text", required: false }])}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Thêm field
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground">Tối đa 8 field. Trường có <b>type=select</b> phải có ít nhất 1 option.</p>
              </TabsContent>

              {/* Targeting */}
              <TabsContent value="targeting" className="space-y-4">
                <div>
                  <Label>Pages (đường dẫn áp dụng — "*" = mọi trang)</Label>
                  <ChipsInput
                    value={f.targeting.pages}
                    onChange={(v) => set("targeting", { ...f.targeting, pages: v.length ? v : ["*"] })}
                    suggestions={["*", "/", "/gia-vang", "/tien-dien-tu", "/ty-gia-ngoai-te", "/chung-khoan"]}
                    placeholder="Nhập path rồi Enter…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Delay (giây)" v={f.targeting.delaySeconds} min={0} max={600} onChange={(n) => set("targeting", { ...f.targeting, delaySeconds: n })} />
                  <NumberField label="Frequency (ngày)" v={f.targeting.frequencyDays} min={0} max={365} onChange={(n) => set("targeting", { ...f.targeting, frequencyDays: n })} />
                  <NumberField label="Scroll trigger (%)" v={f.targeting.scrollPercent} min={0} max={100} onChange={(n) => set("targeting", { ...f.targeting, scrollPercent: n })} />
                  <div className="flex items-end gap-2">
                    <Switch checked={f.targeting.hideForSubscribers} onCheckedChange={(v) => set("targeting", { ...f.targeting, hideForSubscribers: v })} />
                    <Label>Ẩn với subscriber</Label>
                  </div>
                </div>
                <div className="rounded-md border border-dashed border-border p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Override cho user đã đăng nhập</div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Delay (giây)"
                      v={f.targeting.authDelaySeconds ?? 0}
                      min={0}
                      max={3600}
                      onChange={(n) => set("targeting", { ...f.targeting, authDelaySeconds: n || undefined })}
                    />
                    <NumberField
                      label="Frequency (ngày)"
                      v={f.targeting.authFrequencyDays ?? 0}
                      min={0}
                      max={365}
                      onChange={(n) => set("targeting", { ...f.targeting, authFrequencyDays: n || undefined })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Bắt đầu hiển thị</Label>
                    <Input
                      type="datetime-local"
                      value={toLocal(f.starts_at)}
                      onChange={(e) => set("starts_at", fromLocal(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Kết thúc hiển thị</Label>
                    <Input
                      type="datetime-local"
                      value={toLocal(f.ends_at)}
                      onChange={(e) => set("ends_at", fromLocal(e.target.value))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Live preview */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {f.theme.layout} · {f.theme.animation} · {f.theme.accent}
              </Badge>
            </div>
            <PopupStage form={f} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Sub-components ─────────────────────────

function Counter({ v, max }: { v: string; max: number }) {
  const used = v?.length ?? 0;
  const warn = used > max * 0.9;
  return (
    <div className={`mt-0.5 text-right text-[10px] ${warn ? "text-[var(--down)]" : "text-muted-foreground"}`}>
      {used}/{max}
    </div>
  );
}

function NumberField({ label, v, min, max, onChange }: { label: string; v: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={v}
        onChange={(e) => {
          const n = Math.max(min, Math.min(max, parseInt(e.target.value || "0", 10) || 0));
          onChange(n);
        }}
      />
    </div>
  );
}

function ChipsInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="opacity-60 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({
  field,
  canMoveUp,
  canMoveDown,
  onChange,
  onRemove,
  onUp,
  onDown,
}: {
  field: Field;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (f: Field) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!canMoveUp} onClick={onUp}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!canMoveDown} onClick={onDown}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-[var(--down)]" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px]">Tên (name)</Label>
          <Input value={field.name} onChange={(e) => onChange({ ...field, name: e.target.value })} maxLength={40} />
        </div>
        <div>
          <Label className="text-[11px]">Label</Label>
          <Input value={field.label} onChange={(e) => onChange({ ...field, label: e.target.value })} maxLength={80} />
        </div>
        <div>
          <Label className="text-[11px]">Type</Label>
          <Select value={field.type} onValueChange={(v) => onChange({ ...field, type: v as Field["type"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="select">Select</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px]">Placeholder</Label>
          <Input value={field.placeholder ?? ""} onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })} maxLength={120} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Switch checked={field.required} onCheckedChange={(v) => onChange({ ...field, required: v })} />
          <Label className="text-[11px]">Bắt buộc</Label>
        </div>
        {field.type === "select" && (
          <div className="col-span-2">
            <Label className="text-[11px]">Options</Label>
            <ChipsInput
              value={field.options ?? []}
              onChange={(v) => onChange({ ...field, options: v })}
              placeholder="Thêm option…"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Preview stage ─────────────────────────

function PopupStage({ form }: { form: PopupForm }) {
  // Re-mount when key animation/layout settings change so the user sees the entrance again.
  const [tick, setTick] = useState(0);
  useEffect(() => setTick((t) => t + 1), [form.theme.animation, form.theme.layout, form.theme.accent]);

  const stagePos =
    form.theme.layout === "bottom"
      ? "items-end justify-center pb-4"
      : form.theme.layout === "side"
        ? "items-start justify-end pt-6 pr-4"
        : "items-center justify-center";

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-[color-mix(in_oklab,var(--background)_70%,#000)]">
      {/* Fake page chrome */}
      <div className="absolute inset-x-0 top-0 flex h-7 items-center gap-1.5 border-b border-border bg-muted/40 px-3">
        <span className="h-2 w-2 rounded-full bg-[var(--down)]/60" />
        <span className="h-2 w-2 rounded-full bg-[var(--gold)]/60" />
        <span className="h-2 w-2 rounded-full bg-[var(--up)]/60" />
        <span className="ml-2 text-[10px] text-muted-foreground">marketwatch.vn{form.targeting.pages[0] && form.targeting.pages[0] !== "*" ? form.targeting.pages[0] : ""}</span>
      </div>
      <div
        aria-hidden
        className="absolute inset-x-3 top-10 grid grid-cols-3 gap-1.5 opacity-30"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-3 rounded-sm bg-muted" />
        ))}
      </div>
      <div className={`absolute inset-0 flex p-4 pt-10 ${stagePos}`}>
        <div key={tick} className={animClass(form.theme.animation, form.theme.layout)}>
          <PopupCard form={form} />
        </div>
      </div>
    </div>
  );
}

function PopupCard({ form }: { form: PopupForm }) {
  const accentMap = {
    gold: "var(--gold)",
    primary: "var(--primary)",
    up: "var(--up)",
    down: "var(--down)",
  } as const;
  const accent = accentMap[form.theme.accent];
  const width =
    form.theme.layout === "bottom" ? "w-[min(420px,90%)]" : form.theme.layout === "side" ? "w-[280px]" : "w-[320px]";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-5 text-center shadow-xl ${width}`}
      style={{
        borderColor: `color-mix(in oklab, ${accent} 30%, var(--border))`,
        boxShadow: `0 20px 60px -20px color-mix(in oklab, ${accent} 40%, transparent)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px"
        style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)` }}
      />
      <button type="button" className="absolute top-2 right-2 opacity-50">
        <X className="h-3 w-3" />
      </button>

      <div className="relative mx-auto mb-3 inline-flex">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border"
          style={{
            borderColor: `color-mix(in oklab, ${accent} 40%, transparent)`,
            color: accent,
            background: `color-mix(in oklab, ${accent} 8%, transparent)`,
          }}
        >
          <Mail className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <span
          className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-card"
          style={{ background: accent, color: "var(--background)" }}
        >
          <Bell className="h-2 w-2" strokeWidth={2.5} />
        </span>
      </div>

      <div className="font-display text-base leading-tight">{form.title || "—"}</div>
      {form.subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{form.subtitle}</div>}
      {form.body_md && <div className="mt-1.5 whitespace-pre-wrap text-[10px] text-foreground/70">{form.body_md}</div>}

      <div className="relative mt-3 text-left">
        <Mail aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="email"
          placeholder="Nhập email của bạn"
          readOnly
          className="h-9 w-full rounded-md border-2 border-border bg-background/60 pl-8 pr-2 text-xs"
        />
      </div>
      <button
        type="button"
        className="mt-2 h-9 w-full rounded-md text-xs font-semibold"
        style={{ background: accent, color: "var(--background)" }}
      >
        {form.cta_label || "Đăng ký ngay"}
      </button>
      <p className="mt-2 text-[10px] font-medium" style={{ color: accent }}>
        Miễn phí • Có thể hủy bất kỳ lúc nào
      </p>
      {form.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {form.topics.slice(0, 6).map((t) => (
            <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function animClass(anim: Theme["animation"], layout: Theme["layout"]): string {
  if (anim === "pop") return "animate-in zoom-in-95 duration-300";
  if (anim === "slide") {
    if (layout === "bottom") return "animate-in slide-in-from-bottom-6 duration-300";
    if (layout === "side") return "animate-in slide-in-from-right-6 duration-300";
    return "animate-in slide-in-from-top-4 duration-300";
  }
  return "animate-in fade-in duration-300";
}

// datetime-local <-> ISO helpers
function toLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (globalThis.Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function fromLocal(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return globalThis.Number.isNaN(d.getTime()) ? null : d.toISOString();
}
