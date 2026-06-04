import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Code2 } from "lucide-react";
import {
  listCodeInjections,
  upsertCodeInjection,
  deleteCodeInjection,
} from "@/lib/admin/code-injections.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_admin/mw-admin/code-injection")({
  component: CodeInjectionPage,
});

type Location = "head" | "body_start" | "body_end";

interface InjectionRow {
  id: string;
  name: string;
  location: Location;
  code: string;
  enabled: boolean;
  priority: number;
  notes: string | null;
  updated_at: string;
}

interface FormState {
  id?: string;
  name: string;
  location: Location;
  code: string;
  enabled: boolean;
  priority: number;
  notes: string;
}

const LOCATION_LABEL: Record<Location, string> = {
  head: "Header (<head>)",
  body_start: "Đầu body (sau <body>)",
  body_end: "Cuối body (footer)",
};

const LOCATION_HINT: Record<Location, string> = {
  head: "Dán meta verification, Google Analytics gtag.js, Google Tag Manager <script>, AdSense, mã xác minh search console…",
  body_start: "Dán Google Tag Manager <noscript>, Meta Pixel <noscript>, mã đo lường cần chạy sớm trong body…",
  body_end: "Dán chat widget, livechat, mã remarketing, pixel theo dõi cuối trang…",
};

const emptyForm = (): FormState => ({
  name: "",
  location: "head",
  code: "",
  enabled: true,
  priority: 0,
  notes: "",
});

function CodeInjectionPage() {
  const listFn = useServerFn(listCodeInjections);
  const upsertFn = useServerFn(upsertCodeInjection);
  const deleteFn = useServerFn(deleteCodeInjection);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "code-injections"],
    queryFn: () => listFn(),
  });

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);

  const upsertMut = useMutation({
    mutationFn: (payload: FormState) =>
      upsertFn({
        data: {
          ...(payload.id ? { id: payload.id } : {}),
          name: payload.name.trim(),
          location: payload.location,
          code: payload.code,
          enabled: payload.enabled,
          priority: Number(payload.priority) || 0,
          notes: payload.notes.trim() ? payload.notes.trim() : null,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Đã cập nhật snippet" : "Đã thêm snippet");
      qc.invalidateQueries({ queryKey: ["admin", "code-injections"] });
      setForm(emptyForm());
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá snippet");
      qc.invalidateQueries({ queryKey: ["admin", "code-injections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (data?.items ?? []) as InjectionRow[];
  const grouped: Record<Location, InjectionRow[]> = {
    head: items.filter((i) => i.location === "head"),
    body_start: items.filter((i) => i.location === "body_start"),
    body_end: items.filter((i) => i.location === "body_end"),
  };

  function startEdit(row: InjectionRow) {
    setForm({
      id: row.id,
      name: row.name,
      location: row.location,
      code: row.code,
      enabled: row.enabled,
      priority: row.priority,
      notes: row.notes ?? "",
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm());
    setEditing(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Hãy nhập tên gợi nhớ cho snippet");
      return;
    }
    if (!form.code.trim()) {
      toast.error("Hãy dán nội dung HTML / script");
      return;
    }
    upsertMut.mutate(form);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl">Chèn mã HTML / Script</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý các đoạn mã chèn vào <code className="text-[var(--gold)]">{"<head>"}</code>,
          đầu/cuối <code className="text-[var(--gold)]">{"<body>"}</code> để xác minh và kích hoạt các dịch vụ
          bên ngoài: Google Analytics, Tag Manager, Search Console, AdSense, Meta Pixel, chat widget, mã chạy traffic…
        </p>
        <p className="text-xs text-[var(--down)]">
          ⚠ Mã chèn ở đây chạy trực tiếp trên trang công khai. Chỉ dán snippet từ nguồn tin cậy.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-lg border border-border bg-card/40 p-5"
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-[var(--gold)]" />
          <h2 className="font-semibold">{editing ? "Sửa snippet" : "Thêm snippet mới"}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ci-name">Tên gợi nhớ</Label>
            <Input
              id="ci-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Google Analytics GA4"
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vị trí chèn</Label>
            <Select
              value={form.location}
              onValueChange={(v) => setForm({ ...form, location: v as Location })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="head">{LOCATION_LABEL.head}</SelectItem>
                <SelectItem value="body_start">{LOCATION_LABEL.body_start}</SelectItem>
                <SelectItem value="body_end">{LOCATION_LABEL.body_end}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{LOCATION_HINT[form.location]}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci-code">Mã HTML / Script</Label>
          <Textarea
            id="ci-code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder={'<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag("js", new Date());\n  gtag("config", "G-XXXX");\n</script>'}
            className="min-h-[180px] font-mono text-xs"
            maxLength={20000}
            required
          />
          <p className="text-xs text-muted-foreground">
            Dán nguyên cả thẻ <code>{"<script>"}</code>, <code>{"<meta>"}</code> hoặc <code>{"<noscript>"}</code> như nhà cung cấp gửi.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ci-priority">Thứ tự ưu tiên</Label>
            <Input
              id="ci-priority"
              type="number"
              min={0}
              max={9999}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">Số nhỏ chèn trước.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-notes">Ghi chú (tuỳ chọn)</Label>
            <Input
              id="ci-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="VD: Cấp bởi marketing, hết hạn 12/2026"
              maxLength={500}
            />
          </div>
          <div className="flex items-end gap-3">
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              id="ci-enabled"
            />
            <Label htmlFor="ci-enabled" className="cursor-pointer">
              {form.enabled ? "Đang bật" : "Tạm tắt"}
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={upsertMut.isPending}>
            <Plus className="h-4 w-4" />
            {editing ? "Cập nhật" : "Thêm snippet"}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Huỷ
            </Button>
          )}
        </div>
      </form>

      <section className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có snippet nào.</p>
        ) : (
          (Object.keys(grouped) as Location[]).map((loc) => (
            <div key={loc} className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">
                {LOCATION_LABEL[loc]} · {grouped[loc].length}
              </h3>
              {grouped[loc].length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có snippet ở vị trí này.</p>
              ) : (
                <ul className="space-y-2">
                  {grouped[loc].map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 rounded-md border border-border bg-card/30 p-4 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{row.name}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                              row.enabled
                                ? "bg-[color-mix(in_oklab,var(--up)_18%,transparent)] text-[var(--up)]"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {row.enabled ? "Bật" : "Tắt"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Ưu tiên {row.priority}
                          </span>
                        </div>
                        {row.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">{row.notes}</p>
                        )}
                        <pre className="mt-2 max-h-32 overflow-auto rounded bg-background/60 p-2 text-[11px] leading-snug text-muted-foreground">
                          {row.code.length > 600 ? row.code.slice(0, 600) + "\n…" : row.code}
                        </pre>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" /> Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[var(--down)] hover:text-[var(--down)]"
                          onClick={() => {
                            if (confirm(`Xoá snippet "${row.name}"?`)) deleteMut.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xoá
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}