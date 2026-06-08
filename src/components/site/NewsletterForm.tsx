import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Topic = "gold" | "btc" | "usd";
const TOPIC_OPTIONS: { key: Topic; label: string }[] = [
  { key: "gold", label: "Vàng" },
  { key: "btc", label: "Bitcoin" },
  { key: "usd", label: "USD/VND" },
];

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>(["gold", "btc", "usd"]);

  function toggle(t: Topic) {
    setTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (topics.length === 0) {
      toast.error("Chọn ít nhất 1 chủ đề", { description: "Vàng, Bitcoin hoặc USD/VND." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "footer", topics }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      toast.success("Đăng ký thành công", {
        description: `Bản tin sẽ chỉ gồm: ${topics
          .map((t) => TOPIC_OPTIONS.find((o) => o.key === t)?.label)
          .filter(Boolean)
          .join(", ")}.`,
      });
      setEmail("");
      try { window.dispatchEvent(new CustomEvent("newsletter:subscribed")); } catch {}
    } catch (err: any) {
      toast.error("Đăng ký thất bại", { description: err?.message || "Vui lòng thử lại sau." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="abc@emailcuaban.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>{loading ? "…" : "Đăng ký"}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground mr-1">Chủ đề:</span>
        {TOPIC_OPTIONS.map((t) => {
          const on = topics.includes(t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => toggle(t.key)}
              aria-pressed={on}
              className={`rounded-full border px-2.5 py-0.5 transition ${
                on
                  ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}