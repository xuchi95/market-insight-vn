import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listBroadcasts,
  saveBroadcastDraft,
  previewRecipients,
  sendTestBroadcast,
  sendBroadcast,
  deleteBroadcast,
} from "@/lib/admin/broadcasts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_admin/mw-admin/broadcasts")({
  component: AdminBroadcastsPage,
});

type Audience = "all_users" | "newsletter" | "admins" | "custom_emails";

function AdminBroadcastsPage() {
  const listFn = useServerFn(listBroadcasts);
  const saveFn = useServerFn(saveBroadcastDraft);
  const previewFn = useServerFn(previewRecipients);
  const testFn = useServerFn(sendTestBroadcast);
  const sendFn = useServerFn(sendBroadcast);
  const deleteFn = useServerFn(deleteBroadcast);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["admin", "broadcasts"], queryFn: () => listFn() });

  const [draftId, setDraftId] = useState<string | undefined>();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("newsletter");
  const [customEmails, setCustomEmails] = useState("");
  const [topicsFilter, setTopicsFilter] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "broadcasts"] });

  function payload() {
    return {
      id: draftId,
      subject,
      body_md: body,
      audience,
      custom_emails: customEmails.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean),
      topics_filter: topicsFilter.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean),
    };
  }

  async function handleSave() {
    try {
      const r = await saveFn({ data: payload() });
      setDraftId(r.id);
      toast.success("Đã lưu draft");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handlePreview() {
    try {
      const p = payload();
      const r = await previewFn({ data: { audience: p.audience, custom_emails: p.custom_emails, topics_filter: p.topics_filter } });
      setPreview(r);
      toast.success(`${r.count} người nhận hợp lệ`);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleTest() {
    if (!testEmail) return toast.error("Nhập email test");
    try {
      await testFn({ data: { subject, body_md: body, toEmail: testEmail } });
      toast.success("Đã gửi email test");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleSend() {
    if (!draftId) return toast.error("Lưu draft trước");
    if (!confirm("Gửi broadcast tới toàn bộ người nhận đã chọn?")) return;
    try {
      const r = await sendFn({ data: { id: draftId } });
      toast.success(`Đã enqueue ${r.sent}/${r.total} (${r.failed} fail)`);
      setDraftId(undefined); setSubject(""); setBody(""); setPreview(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">Email broadcast</h1>
        <p className="text-sm text-muted-foreground">Gửi email tuỳ chỉnh tới user / subscriber / admin.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-lg border border-border bg-card p-5">
          <div>
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>Body (Markdown) *</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="**Xin chào**, đây là bản tin..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newsletter">Newsletter subscribers</SelectItem>
                  <SelectItem value="all_users">Tất cả user</SelectItem>
                  <SelectItem value="admins">Chỉ admin</SelectItem>
                  <SelectItem value="custom_emails">Email tuỳ chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topics filter (newsletter)</Label>
              <Input placeholder="gold, btc, usd" value={topicsFilter} onChange={(e) => setTopicsFilter(e.target.value)} />
            </div>
          </div>
          {audience === "custom_emails" && (
            <div>
              <Label>Email list (cách nhau bởi dấu phẩy/xuống dòng)</Label>
              <Textarea rows={4} value={customEmails} onChange={(e) => setCustomEmails(e.target.value)} />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={handleSave}>Lưu draft</Button>
            <Button variant="outline" onClick={handlePreview}>Xem số người nhận</Button>
            <Input className="max-w-xs" placeholder="email-test@…" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <Button variant="outline" onClick={handleTest}>Gửi test</Button>
            <Button onClick={handleSend} disabled={!draftId}>Gửi thật</Button>
          </div>

          {preview && (
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{preview.count} người nhận</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {preview.sample.join(", ")}{preview.count > preview.sample.length ? ` … (+${preview.count - preview.sample.length})` : ""}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Lịch sử</div>
          <div className="space-y-2">
            {data?.broadcasts.map((b) => (
              <div key={b.id} className="rounded-md border border-border/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{b.subject}</div>
                  <Badge variant={b.status === "sent" ? "default" : b.status === "failed" ? "destructive" : "outline"}>{b.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.audience} · {b.sent_count}/{b.total_recipients} sent · {new Date(b.created_at).toLocaleString("vi-VN")}
                </div>
                <div className="mt-2 flex gap-2">
                  {b.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setDraftId(b.id); setSubject(b.subject); setBody(b.body_md);
                      setAudience(b.audience as Audience);
                      setCustomEmails((b.custom_emails as string[]).join(", "));
                      setTopicsFilter((b.topics_filter as string[]).join(", "));
                    }}>Mở</Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={async () => {
                    if (!confirm("Xoá?")) return;
                    try { await deleteFn({ data: { id: b.id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
                  }}>Xoá</Button>
                </div>
              </div>
            ))}
            {data && data.broadcasts.length === 0 && (
              <div className="text-sm text-muted-foreground">Chưa có broadcast nào.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}