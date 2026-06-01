import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listSubscribers, unsubscribeSubscriber, deleteSubscriber } from "@/lib/admin/inbox.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_admin/mw-admin/newsletter")({
  component: NewsletterPage,
});

function NewsletterPage() {
  const listFn = useServerFn(listSubscribers);
  const unsubFn = useServerFn(unsubscribeSubscriber);
  const delFn = useServerFn(deleteSubscriber);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"all" | "active" | "unsubscribed">("active");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "subs", status, search],
    queryFn: () => listFn({ data: { status, search: search || undefined, limit: 300 } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "subs"] });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Bản tin</h1>
          <p className="text-sm text-muted-foreground">Danh sách subscriber newsletter.</p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Đang theo dõi</SelectItem>
              <SelectItem value="unsubscribed">Đã huỷ</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Tìm email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Topics</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-left">Ngày tạo</th>
              <th className="px-3 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {data?.subscribers.map((s) => (
              <tr key={s.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                <td className="px-3 py-2 text-xs">{(s.topics as string[]).join(", ")}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{s.source ?? "—"}</td>
                <td className="px-3 py-2">
                  {s.unsubscribed_at ? <Badge variant="outline">đã huỷ</Badge> : <Badge>active</Badge>}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("vi-VN")}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { await unsubFn({ data: { id: s.id, unsubscribe: !s.unsubscribed_at } }); refresh(); } catch (e) { toast.error((e as Error).message); }
                    }}>{s.unsubscribed_at ? "Kích hoạt" : "Huỷ"}</Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      if (!confirm(`Xoá ${s.email}?`)) return;
                      try { await delFn({ data: { id: s.id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
                    }}>Xoá</Button>
                  </div>
                </td>
              </tr>
            ))}
            {data && data.subscribers.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">Không có subscriber.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}