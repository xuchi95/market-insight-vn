import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "footer" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      toast.success("Đăng ký thành công", { description: "Vui lòng kiểm tra hộp thư để xác nhận." });
      setEmail("");
      try { window.dispatchEvent(new CustomEvent("newsletter:subscribed")); } catch {}
    } catch (err: any) {
      toast.error("Đăng ký thất bại", { description: err?.message || "Vui lòng thử lại sau." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        type="email"
        required
        placeholder="abc@emailcuaban.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={loading}>{loading ? "…" : "Đăng ký"}</Button>
    </form>
  );
}