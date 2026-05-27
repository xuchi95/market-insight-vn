import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
      toast.success("Đã gửi liên hệ", { description: "Chúng tôi sẽ phản hồi qua email." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error("Gửi thất bại", { description: err?.message || "Vui lòng thử lại sau." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="c-name">Họ tên *</Label>
          <Input id="c-name" required maxLength={120} value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-email">Email *</Label>
          <Input id="c-email" type="email" required maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-subject">Tiêu đề</Label>
        <Input id="c-subject" maxLength={200} value={form.subject} onChange={(e) => update("subject", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-message">Nội dung *</Label>
        <Textarea id="c-message" required rows={6} maxLength={5000} value={form.message} onChange={(e) => update("message", e.target.value)} />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Đang gửi…" : "Gửi liên hệ"}</Button>
    </form>
  );
}