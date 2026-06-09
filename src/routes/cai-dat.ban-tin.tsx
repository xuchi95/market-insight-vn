import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, BellRing, BellOff, Pencil, Check, X, Loader2, ArrowUp, ArrowDown, GripVertical, Star, Plus, Trash2, BookmarkCheck } from "lucide-react";
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
import {
  listMyPresets,
  createPreset,
  updatePreset,
  deletePreset,
  setDefaultPreset,
} from "@/lib/newsletter-presets.functions";

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
      <main className="mx-auto max-w-6xl px-5 py-10">
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

          <div className="mb-5 rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-foreground">Thứ tự hiển thị trong email</div>
                <div className="text-xs text-muted-foreground">Kéo lên/xuống để sắp xếp — block phía trên sẽ xuất hiện trước trong bản tin.</div>
              </div>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground hidden sm:inline">{topics.length} chủ đề</span>
            </div>
            <ol className="space-y-1.5">
              {topics.map((t, i) => {
                const labelMap: Record<Topic, string> = {
                  "gold": "Vàng thế giới (XAU/USD)",
                  "gold-sjc": "Vàng SJC (VND/lượng)",
                  "btc": "Bitcoin (BTC)",
                  "eth": "Ethereum (ETH)",
                  "sol": "Solana (SOL)",
                  "bnb": "BNB",
                  "usd": "USD/VND",
                  "eur": "EUR/VND",
                };
                return (
                  <li
                    key={t}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--gold)]/15 text-[11px] font-semibold text-[var(--gold)] shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-foreground truncate">{labelMap[t]}</span>
                    <button
                      type="button"
                      onClick={() => moveTopic(i, -1)}
                      disabled={busy || i === 0}
                      className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Di chuyển lên"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTopic(i, 1)}
                      disabled={busy || i === topics.length - 1}
                      className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Di chuyển xuống"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Bật / tắt chủ đề</div>
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

      {active && <PresetsManager currentTopics={topics} />}
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
  return <SubscribeFormImpl defaultEmail={defaultEmail} onSubmit={onSubmit} busy={busy} />;
}

type Topic = "gold" | "gold-sjc" | "btc" | "eth" | "sol" | "bnb" | "usd" | "eur";
const ALL_TOPICS: { key: Topic; label: string; group: string }[] = [
  { key: "gold",     label: "Vàng XAU",       group: "Vàng" },
  { key: "gold-sjc", label: "Vàng SJC",       group: "Vàng" },
  { key: "btc",      label: "Bitcoin",        group: "Crypto" },
  { key: "eth",      label: "Ethereum",       group: "Crypto" },
  { key: "sol",      label: "Solana",         group: "Crypto" },
  { key: "bnb",      label: "BNB",            group: "Crypto" },
  { key: "usd",      label: "USD/VND",        group: "Tỷ giá" },
  { key: "eur",      label: "EUR/VND",        group: "Tỷ giá" },
];

function PresetsManager({ currentTopics }: { currentTopics: Topic[] }) {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyPresets);
  const create = useServerFn(createPreset);
  const update = useServerFn(updatePreset);
  const remove = useServerFn(deletePreset);
  const setDefault = useServerFn(setDefaultPreset);

  const { data, isLoading } = useQuery({
    queryKey: ["my-newsletter-presets"],
    queryFn: () => fetchList(),
  });
  const presets = data?.presets ?? [];
  const max = data?.max ?? 20;

  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Topic[]>(currentTopics);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTopics, setEditTopics] = useState<Topic[]>([]);

  function toggle(list: Topic[], setList: (v: Topic[]) => void, t: Topic) {
    setList(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Đặt tên cho preset"); return; }
    if (picked.length === 0) { toast.error("Chọn ít nhất 1 chủ đề"); return; }
    setBusy(true);
    try {
      await create({ data: { name: trimmed, topics: picked, makeDefault: presets.length === 0 } });
      toast.success("Đã lưu preset", { description: trimmed });
      setAdding(false); setName(""); setPicked(currentTopics);
      qc.invalidateQueries({ queryKey: ["my-newsletter-presets"] });
    } catch (e: any) {
      toast.error("Không thể lưu", { description: e?.message });
    } finally { setBusy(false); }
  }

  async function handleSetDefault(id: string | null) {
    setBusy(true);
    try {
      await setDefault({ data: { id } });
      toast.success(id ? "Đã đặt preset mặc định" : "Đã bỏ preset mặc định");
      qc.invalidateQueries({ queryKey: ["my-newsletter-presets"] });
    } catch (e: any) {
      toast.error("Không thể cập nhật", { description: e?.message });
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá preset này?")) return;
    setBusy(true);
    try {
      await remove({ data: { id } });
      toast.success("Đã xoá preset");
      qc.invalidateQueries({ queryKey: ["my-newsletter-presets"] });
    } catch (e: any) {
      toast.error("Không thể xoá", { description: e?.message });
    } finally { setBusy(false); }
  }

  function startEdit(p: { id: string; name: string; topics: string[] }) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditTopics(p.topics as Topic[]);
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) { toast.error("Đặt tên cho preset"); return; }
    if (editTopics.length === 0) { toast.error("Chọn ít nhất 1 chủ đề"); return; }
    setBusy(true);
    try {
      await update({ data: { id: editingId, name: trimmed, topics: editTopics } });
      toast.success("Đã cập nhật preset");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["my-newsletter-presets"] });
    } catch (e: any) {
      toast.error("Không thể cập nhật", { description: e?.message });
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div>
          <h2 className="font-display text-lg text-foreground flex items-center gap-2">
            <BookmarkCheck className="h-4 w-4 text-[var(--gold)]" /> Bộ chủ đề (preset)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lưu nhiều bộ chủ đề khác nhau và đánh dấu một bộ làm mặc định cho bản tin tuần. Tối đa {max} bộ.
          </p>
        </div>
        {!adding && presets.length < max && (
          <Button size="sm" variant="outline" onClick={() => { setAdding(true); setPicked(currentTopics); }}>
            <Plus className="h-4 w-4" /> <span className="ml-1.5">Tạo preset mới</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải presets…
        </div>
      ) : (
        <>
          {adding && (
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4 space-y-3">
              <div>
                <Label className="text-xs">Tên preset</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vd: Chỉ vàng & USD"
                  className="mt-1"
                  maxLength={60}
                />
              </div>
              <TopicPicker selected={picked} onToggle={(t) => toggle(picked, setPicked, t)} />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setAdding(false); setName(""); }} disabled={busy}>Huỷ</Button>
                <Button onClick={handleCreate} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="ml-1.5">Lưu preset</span>
                </Button>
              </div>
            </div>
          )}

          {presets.length === 0 && !adding && (
            <p className="mt-4 text-sm text-muted-foreground">
              Chưa có preset nào. Tạo bộ đầu tiên để dùng cho bản tin tuần.
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {presets.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <li key={p.id} className="rounded-xl border border-border bg-background/60 p-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={60}
                      />
                      <TopicPicker selected={editTopics} onToggle={(t) => toggle(editTopics, setEditTopics, t)} />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={busy}>Huỷ</Button>
                        <Button size="sm" onClick={saveEdit} disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          <span className="ml-1.5">Lưu</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                          {p.is_default && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--gold)]">
                              <Star className="h-3 w-3 fill-current" /> Mặc định
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(p.topics as Topic[]).map((t) => {
                            const label = ALL_TOPICS.find((x) => x.key === t)?.label ?? t;
                            return (
                              <span key={t} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.is_default ? (
                          <Button size="sm" variant="ghost" onClick={() => handleSetDefault(null)} disabled={busy}>
                            Bỏ mặc định
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleSetDefault(p.id)} disabled={busy}>
                            <Star className="h-3.5 w-3.5" /> <span className="ml-1.5">Đặt mặc định</span>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => startEdit(p)} disabled={busy}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} disabled={busy} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {presets.length > 0 && (
            <p className="mt-4 text-[11px] text-muted-foreground">
              Bản tin tuần sẽ dùng <strong className="text-foreground">preset mặc định</strong> nếu có. Nếu không có, hệ thống dùng danh sách chủ đề bật/tắt phía trên.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function TopicPicker({ selected, onToggle }: { selected: Topic[]; onToggle: (t: Topic) => void }) {
  const groups = ["Vàng", "Crypto", "Tỷ giá"] as const;
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g}>
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1">{g}</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TOPICS.filter((t) => t.group === g).map((t) => {
              const on = selected.includes(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onToggle(t.key)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
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
        </div>
      ))}
    </div>
  );
}

function SubscribeFormImpl({
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