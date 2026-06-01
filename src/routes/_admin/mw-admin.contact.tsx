import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listContactSubmissions, markContactRead, deleteContact } from "@/lib/admin/inbox.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_admin/mw-admin/contact")({
  component: ContactInboxPage,
});

function ContactInboxPage() {
  const listFn = useServerFn(listContactSubmissions);
  const markFn = useServerFn(markContactRead);
  const delFn = useServerFn(deleteContact);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"all" | "unread" | "read">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contact", status],
    queryFn: () => listFn({ data: { status, limit: 300 } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "contact"] });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Liên hệ</h1>
          <p className="text-sm text-muted-foreground">Tin nhắn từ form liên hệ.</p>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="unread">Chưa đọc</SelectItem>
            <SelectItem value="read">Đã đọc</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}

      <div className="space-y-3">
        {data?.submissions.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">&lt;{c.email}&gt;</span>
                  {!c.read_at && <Badge>mới</Badge>}
                </div>
                {c.subject && <div className="mt-1 text-sm font-medium">{c.subject}</div>}
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{c.message}</p>
                <div className="mt-2 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("vi-VN")}</div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button size="sm" variant="outline" onClick={async () => {
                  try { await markFn({ data: { id: c.id, read: !c.read_at } }); refresh(); } catch (e) { toast.error((e as Error).message); }
                }}>{c.read_at ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}</Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject ?? "Liên hệ MarketWatch")}`}>Trả lời</a>
                </Button>
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!confirm("Xoá?")) return;
                  try { await delFn({ data: { id: c.id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
                }}>Xoá</Button>
              </div>
            </div>
          </div>
        ))}
        {data && data.submissions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Không có tin nhắn.
          </div>
        )}
      </div>
    </div>
  );
}