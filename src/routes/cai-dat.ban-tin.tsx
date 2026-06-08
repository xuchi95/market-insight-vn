import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, BellRing, BellOff, Pencil, Check, X, Loader2, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  getMySubscriptions,
  subscribeNewsletter,
  unsubscribeNewsletter,
  changeNewsletterEmail,
  updateNewsletterTopics,
} from "@/lib/newsletter.functions";

const TITLE = "Quản lý bản tin — MarketWatch";
const DESC = "Đăng ký, đổi địa chỉ email hoặc huỷ nhận bản tin tổng hợp vàng, crypto và ngoại tệ từ MarketWatch.";
const URL = "https://marketwatch.vn/cai-dat/ban-tin";

export const Route = createFileRoute("/cai-dat/ban-tin")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NewsletterSettingsPage,
});

function NewsletterSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/dang-nhap", replace: true });
    }
  }, [authLoading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">Quản lý bản tin</span>
        </nav>

        <header className="mb-8">
          <div className="eyebrow text-[var(--gold)]">Cài đặt</div>
          <h1 className="font-display text-4xl mt-1">Quản lý bản tin</h1>
        </header>

        {authLoading || !user ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : (
          <SettingsCard />
        )}
      </main>
      <Footer />
    </div>
  );
}

function SettingsCard() {
  const qc = useQueryClient();
  const fetchMy = useServerFn(getMySubscriptions);
  const subscribe = useServerFn(subscribeNewsletter);
  const unsubscribe = useServerFn(unsubscribeNewsletter);
  const changeEmail = useServerFn(changeNewsletterEmail);
  const updateTopics = useServerFn(updateNewsletterTopics);

  const { data, isLoading } = useQuery({
    queryKey: ["my-newsletter"],
    queryFn: () => fetchMy(),
  });

  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const accountEmail = data?.accountEmail ?? "";
  const active = (data?.subscriptions ?? []).find((s) => !s.unsubscribed_at);
  type Topic = "gold" | "gold-sjc" | "btc" | "eth" | "sol" | "bnb" | "usd" | "eur";
  const topics = (active?.topics ?? ["gold", "btc", "usd"]) as Topic[];

  async function handleToggleTopic(topic: Topic) {
    if (!active) return;
    const next = topics.includes(topic) ? topics.filter((t) => t !== topic) : [...topics, topic];
    if (next.length === 0) {
      toast.error("Chọn ít nhất 1 chủ đề");
      return;
    }
    setBusy(true);
    try {
      await updateTopics({ data: { email: active.email, topics: next } });
      toast.success("Đã cập nhật chủ đề");
      qc.invalidateQueries({ queryKey: ["my-newsletter"] });
    } catch (e: any) {
      toast.error("Không thể cập nhật", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleReorder(next: Topic[]) {
    if (!active) return;
    setBusy(true);
    try {
      await updateTopics({ data: { email: active.email, topics: next } });
      toast.success("Đã cập nhật thứ tự");
      qc.invalidateQueries({ queryKey: ["my-newsletter"] });
    } catch (e: any) {
      toast.error("Không thể sắp xếp", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  function moveTopic(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= topics.length) return;
    const next = [...topics];
    [next[index], next[target]] = [next[target], next[index]];
    handleReorder(next);
  }

  async function handleSubscribe(email: string) {
    setBusy(true);
    try {
      await subscribe({ data: { email } });
      toast.success("Đã đăng ký", { description: `Đã gửi email xác nhận tới ${email}.` });
      qc.invalidateQueries({ queryKey: ["my-newsletter"] });
      try { localStorage.setItem("mw_nl_subscribed", "1"); } catch {}
    } catch (e: any) {
      toast.error("Không thể đăng ký", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe(email: string) {
    setBusy(true);
    try {
      await unsubscribe({ data: { email } });
      toast.success("Đã huỷ đăng ký", { description: `${email} sẽ không còn nhận bản tin.` });
      qc.invalidateQueries({ queryKey: ["my-newsletter"] });
    } catch (e: any) {
      toast.error("Không thể huỷ", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleChange() {
    if (!active) return;
    const next = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast.error("Email không hợp lệ");
      return;
    }
    setBusy(true);
    try {
      await changeEmail({ data: { oldEmail: active.email, newEmail: next } });
      toast.success("Đã đổi địa chỉ", { description: `Bản tin sẽ được gửi tới ${next}.` });
      setEditing(false);
      setNewEmail("");
      qc.invalidateQueries({ queryKey: ["my-newsletter"] });
    } catch (e: any) {
      toast.error("Không thể đổi", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải đăng ký…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-[color-mix(in_oklab,var(--gold)_8%,transparent)] p-6">
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[var(--gold)]/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--gold)]">
            <Mail className="h-3.5 w-3.5" /> Trạng thái bản tin
          </div>

          {active ? (
            <>
              <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-sm font-medium text-emerald-400">
                      <BellRing className="h-3 w-3" /> Đang nhận
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-medium">{active.email}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Đăng ký từ {new Date(active.created_at).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>

              {editing ? (
                <div className="mt-5 rounded-lg border border-border bg-background/40 p-4 space-y-3">
                  <Label htmlFor="new-email" className="text-xs">Địa chỉ email mới</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email-moi@cua-ban.vn"
                      className="flex-1"
                    />
                    <Button onClick={handleChange} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      <span className="ml-1.5">Xác nhận</span>
                    </Button>
                    <Button variant="ghost" onClick={() => { setEditing(false); setNewEmail(""); }} disabled={busy}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Địa chỉ cũ sẽ tự động bị huỷ đăng ký.
                  </p>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setEditing(true); setNewEmail(active.email); }}
                    disabled={busy}
                  >
                    <Pencil className="h-4 w-4" /> <span className="ml-1.5">Đổi địa chỉ</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleUnsubscribe(active.email)}
                    disabled={busy}
                    className="text-destructive hover:text-destructive"
                  >
                    <BellOff className="h-4 w-4" /> <span className="ml-1.5">Huỷ đăng ký</span>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <SubscribeForm
              defaultEmail={accountEmail}
              onSubmit={handleSubscribe}
              busy={busy}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/40 p-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="font-display text-lg text-foreground mb-2">Bản tin gồm những gì?</h2>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>Tổng hợp biến động giá vàng SJC, DOJI, PNJ buổi sáng.</li>
          <li>Biến động lớn của Bitcoin, Ethereum và top crypto.</li>
          <li>Tỷ giá USD/VND, EUR, JPY và ngoại tệ chính.</li>
        </ul>
        <p className="mt-3 text-xs">
          Bạn có thể huỷ đăng ký bất cứ lúc nào tại trang này hoặc qua đường dẫn ở cuối mỗi email.
        </p>
      </section>

      {active && (
        <section className="rounded-2xl border border-border bg-card/40 p-6">
          <h2 className="font-display text-lg text-foreground mb-1">Chủ đề bản tin tuần</h2>
          <p className="text-xs text-muted-foreground mb-3">Email chỉ chứa các khối nội dung tương ứng với chủ đề bạn chọn.</p>
          {([
            { group: "Vàng",   items: [{ key: "gold", label: "Vàng thế giới (XAU/USD)" }, { key: "gold-sjc", label: "Vàng SJC (VND/lượng)" }] },
            { group: "Crypto", items: [{ key: "btc", label: "Bitcoin (BTC)" }, { key: "eth", label: "Ethereum (ETH)" }, { key: "sol", label: "Solana (SOL)" }, { key: "bnb", label: "BNB" }] },
            { group: "Tỷ giá", items: [{ key: "usd", label: "USD/VND" }, { key: "eur", label: "EUR/VND" }] },
          ] as const).map((grp) => (
            <div key={grp.group} className="mb-3 last:mb-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{grp.group}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {grp.items.map((t) => {
              const on = topics.includes(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleTopic(t.key)}
                  className={`text-left rounded-lg border px-4 py-3 transition ${
                    on
                      ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]"
                      : "border-border bg-background/40 hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                    <span
                      className={`h-4 w-4 rounded-sm border flex items-center justify-center ${
                        on ? "bg-[var(--gold)] border-[var(--gold)]" : "border-muted-foreground/40"
                      }`}
                    >
                      {on ? <Check className="h-3 w-3 text-background" /> : null}
                    </span>
                  </div>
                </button>
              );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SubscribeForm({
  defaultEmail,
  onSubmit,
  busy,
}: {
  defaultEmail: string;
  onSubmit: (email: string) => void;
  busy: boolean;
}) {
  const [email, setEmail] = useState(defaultEmail);
  return (
    <div className="mt-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-sm text-muted-foreground">
        <BellOff className="h-3 w-3" /> Chưa đăng ký
      </span>
      <p className="mt-3 text-sm">
        Đăng ký để nhận bản tin sáng tổng hợp biến động thị trường.
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(email.trim().toLowerCase()); }}
        className="mt-4 flex gap-2"
      >
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@cua-ban.vn"
          className="flex-1"
        />
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đăng ký"}
        </Button>
      </form>
    </div>
  );
}