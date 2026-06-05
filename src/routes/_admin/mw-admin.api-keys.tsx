import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import {
  listApiKeys,
  createApiKey,
  toggleApiKey,
  deleteApiKey,
} from "@/lib/admin/api-keys.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_admin/mw-admin/api-keys")({
  component: ApiKeysPage,
});

const ALL_SCOPES = ["gold", "crypto", "fuel", "stocks"] as const;
const SCOPE_LABEL: Record<(typeof ALL_SCOPES)[number], string> = {
  gold: "Vàng",
  crypto: "Tiền điện tử",
  fuel: "Xăng dầu",
  stocks: "Chứng khoán",
};

function ApiKeysPage() {
  const qc = useQueryClient();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const toggle = useServerFn(toggleApiKey);
  const del = useServerFn(deleteApiKey);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "api-keys"],
    queryFn: () => list(),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scopes, setScopes] = useState<string[]>([...ALL_SCOPES]);
  const [revealKey, setRevealKey] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          name,
          owner_email: email || null,
          scopes: scopes as (typeof ALL_SCOPES)[number][],
        },
      }),
    onSuccess: (res) => {
      setRevealKey(res.key);
      setName("");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin", "api-keys"] });
      toast.success("Đã tạo API key mới");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "api-keys"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "api-keys"] });
      toast.success("Đã xoá");
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-foreground">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Cấp key cho bên thứ ba truy cập dữ liệu realtime qua REST (snapshot) hoặc SSE (stream).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 font-medium">Tạo key mới</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="k-name">Tên / mô tả</Label>
            <Input id="k-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: site abc.vn" />
          </div>
          <div>
            <Label htmlFor="k-email">Email chủ sở hữu (tuỳ chọn)</Label>
            <Input id="k-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dev@abc.vn" />
          </div>
        </div>
        <div className="mt-4">
          <Label>Quyền truy cập</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {ALL_SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={scopes.includes(s)}
                  onCheckedChange={(c) =>
                    setScopes((prev) => (c ? [...new Set([...prev, s])] : prev.filter((x) => x !== s)))
                  }
                />
                {SCOPE_LABEL[s]}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => createMut.mutate()}
            disabled={!name.trim() || scopes.length === 0 || createMut.isPending}
          >
            <Plus className="mr-1 h-4 w-4" />
            Tạo key
          </Button>
        </div>

        {revealKey && (
          <div className="mt-5 rounded-md border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-4">
            <div className="text-sm font-medium text-foreground">
              Copy key ngay — sẽ không hiện lại sau khi đóng:
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-3 py-2 text-xs">{revealKey}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(revealKey);
                  toast.success("Đã copy");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRevealKey(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 font-medium">Hướng dẫn tích hợp</div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <div className="text-foreground">REST — snapshot 1 lần:</div>
            <code className="mt-1 block break-all rounded bg-background px-3 py-2 text-xs">
              curl -H "x-api-key: YOUR_KEY" {origin}/api/public/v1/snapshot?scopes=gold,crypto
            </code>
          </div>
          <div>
            <div className="text-foreground">SSE — realtime stream (browser):</div>
            <code className="mt-1 block break-all rounded bg-background px-3 py-2 text-xs">
              {`new EventSource("${origin}/api/public/v1/stream?api_key=YOUR_KEY&interval=10")`}
            </code>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4 font-medium">Key hiện có</div>
        {isLoading && <div className="p-4 text-sm text-muted-foreground">Đang tải…</div>}
        {error && (
          <div className="p-4 text-sm text-[var(--down)]">{(error as Error).message}</div>
        )}
        {data && data.items.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">Chưa có key nào.</div>
        )}
        {data && data.items.length > 0 && (
          <div className="divide-y divide-border">
            {data.items.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-foreground">{k.name}</div>
                    {!k.active && <Badge variant="outline">Đã tắt</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <code>{k.key_prefix}…</code>
                    {k.owner_email ? ` · ${k.owner_email}` : ""}
                    {" · "}
                    {(k.scopes ?? []).map((s) => SCOPE_LABEL[s as keyof typeof SCOPE_LABEL] ?? s).join(", ")}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {k.request_count ?? 0} request
                    {k.last_used_at ? ` · gần nhất ${new Date(k.last_used_at).toLocaleString("vi-VN")}` : " · chưa dùng"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={!!k.active}
                    onCheckedChange={(v) => toggleMut.mutate({ id: k.id, active: v })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Xoá key "${k.name}"? Không thể khôi phục.`)) deleteMut.mutate(k.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}