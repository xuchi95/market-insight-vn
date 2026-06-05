import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  previewEmail,
  sendTestEmail,
  EMAIL_TEMPLATES,
  SAMPLE_DATA,
  type EmailTemplateId,
} from "@/lib/email-preview.functions";

export const Route = createFileRoute("/_admin/mw-admin/email-preview")({
  head: () => ({
    meta: [
      { title: "Preview email — MarketWatch Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EmailPreviewPage,
});

function EmailPreviewPage() {
  const { user } = useAuth();
  const [templateId, setTemplateId] = useState<EmailTemplateId>("welcome");
  const [dataJson, setDataJson] = useState<string>(() => JSON.stringify(SAMPLE_DATA.welcome, null, 2));
  const [subject, setSubject] = useState<string>("");
  const [html, setHtml] = useState<string>("");
  const [testEmail, setTestEmail] = useState<string>("");

  const preview = useServerFn(previewEmail);
  const sendTest = useServerFn(sendTestEmail);

  const previewMut = useMutation({
    mutationFn: async () => preview({ data: { template: templateId, dataJson } }),
    onSuccess: (r) => {
      setSubject(r.subject);
      setHtml(r.html);
    },
    onError: (e: any) => toast.error("Render lỗi", { description: e?.message }),
  });

  const sendMut = useMutation({
    mutationFn: async () =>
      sendTest({
        data: {
          template: templateId,
          dataJson,
          to: testEmail.trim().toLowerCase() || undefined,
        },
      }),
    onSuccess: (r) => toast.success("Đã gửi test", { description: `Tới ${r.to}` }),
    onError: (e: any) => toast.error("Gửi lỗi", { description: e?.message }),
  });

  useEffect(() => {
    setDataJson(JSON.stringify(SAMPLE_DATA[templateId], null, 2));
  }, [templateId]);

  useEffect(() => {
    previewMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (user && !testEmail && user.email) setTestEmail(user.email);
  }, [user, testEmail]);

  const validJson = useMemo(() => {
    try { JSON.parse(dataJson); return true; } catch { return false; }
  }, [dataJson]);

  return (
    <div>
      <header className="mb-6">
        <div className="eyebrow text-[var(--gold)]">Quản trị</div>
        <h1 className="font-display text-3xl mt-1">Preview email</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Render thử template tiếng Việt với dữ liệu mẫu trước khi gửi qua Postmark.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <aside className="space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Template</Label>
            <div className="mt-2 space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {EMAIL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                    templateId === t.id
                      ? "bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] border border-[var(--gold)] text-foreground"
                      : "border border-border hover:border-foreground/30 text-foreground/90"
                  }`}
                >
                  {t.label}
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t.id}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="sample-data" className="text-xs uppercase tracking-wider text-muted-foreground">
              Dữ liệu mẫu (JSON)
            </Label>
            <textarea
              id="sample-data"
              value={dataJson}
              onChange={(e) => setDataJson(e.target.value)}
              rows={10}
              spellCheck={false}
              className={`mt-2 w-full rounded-md border bg-background/40 px-3 py-2 text-xs font-mono ${
                validJson ? "border-border" : "border-destructive"
              }`}
            />
            {!validJson && <p className="text-[11px] text-destructive mt-1">JSON không hợp lệ</p>}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              disabled={!validJson || previewMut.isPending}
              onClick={() => previewMut.mutate()}
            >
              {previewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1.5">Render lại</span>
            </Button>
          </div>

          <div>
            <Label htmlFor="test-to" className="text-xs uppercase tracking-wider text-muted-foreground">
              Gửi test tới
            </Label>
            <Input
              id="test-to"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="email@cua-ban.vn"
              className="mt-2"
            />
            <Button
              size="sm"
              className="mt-2 w-full"
              disabled={!validJson || sendMut.isPending}
              onClick={() => sendMut.mutate()}
            >
              {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ml-1.5">Gửi test qua Postmark</span>
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Tiêu đề sẽ có tiền tố <code>[TEST]</code>.
            </p>
          </div>
        </aside>

        <section className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background/40">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Subject</div>
                <div className="text-sm font-medium truncate">{subject || "—"}</div>
              </div>
            </div>
            {previewMut.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <iframe
            title="Email preview"
            srcDoc={html}
            sandbox=""
            className="w-full bg-white"
            style={{ height: "calc(100vh - 240px)", minHeight: 500 }}
          />
        </section>
      </div>
    </div>
  );
}