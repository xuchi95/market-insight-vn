import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RotateCcw, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SubmitStatus = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (status === "success" || status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim() || undefined,
          message: form.message.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
      toast.success("Đã gửi liên hệ", { description: "Chúng tôi sẽ phản hồi qua email." });
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Vui lòng thử lại sau.");
      toast.error("Gửi thất bại", { description: err?.message || "Vui lòng thử lại sau." });
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-[var(--up)]/30 bg-[color-mix(in_oklab,var(--up)_8%,var(--card))] p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--up)]/15">
          <CheckCircle2 className="h-7 w-7 text-[var(--up)]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Đã gửi thành công</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Cảm ơn bạn đã liên hệ. Chúng tôi đã nhận được tin nhắn và sẽ phản hồi qua email trong thời gian sớm nhất.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => { setStatus("idle"); setErrorMsg(""); }}
          className="mt-2"
        >
          <RotateCcw className="h-4 w-4 mr-2" /> Gửi tin nhắn khác
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
      {status === "error" && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--down)]/30 bg-[color-mix(in_oklab,var(--down)_8%,var(--card))] p-4">
          <XCircle className="h-5 w-5 text-[var(--down)] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Gửi thất bại</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Họ tên *</Label>
          <Input id="c-name" required maxLength={120} value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-email">Email *</Label>
          <Input id="c-email" type="email" required maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-subject">Tiêu đề</Label>
        <Input id="c-subject" maxLength={200} value={form.subject} onChange={(e) => update("subject", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-message">Nội dung *</Label>
        <Textarea id="c-message" required rows={6} maxLength={5000} value={form.message} onChange={(e) => update("message", e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Đang gửi…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" /> Gửi liên hệ
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
