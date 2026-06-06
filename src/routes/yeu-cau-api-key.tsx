import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Mail,
  Building2,
  Globe,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/yeu-cau-api-key")({
  head: () => ({
    meta: [
      { title: "Yêu cầu API key — MarketWatch" },
      {
        name: "description",
        content:
          "Đăng ký API key MarketWatch để tích hợp dữ liệu vàng, crypto, xăng dầu và chứng khoán Việt Nam vào website hoặc app của bạn — duyệt trong 1–2 ngày.",
      },
      { property: "og:title", content: "Yêu cầu API key — MarketWatch" },
      {
        property: "og:description",
        content:
          "Form đăng ký API key cho nhà phát triển. Miễn phí cho dự án cá nhân và startup.",
      },
      { property: "og:url", content: "https://marketwatch.vn/yeu-cau-api-key" },
    ],
    links: [{ rel: "canonical", href: "https://marketwatch.vn/yeu-cau-api-key" }],
  }),
  component: ApiKeyRequestPage,
});

const SCOPES = [
  { id: "gold", label: "Vàng (SJC, PNJ, XAU/USD)", desc: "Giá vàng trong nước và quốc tế." },
  { id: "crypto", label: "Tiền điện tử", desc: "BTC, ETH và 100+ coin theo realtime." },
  { id: "fuel", label: "Xăng dầu Việt Nam", desc: "Giá bán lẻ A95, E5, DO, KO." },
  { id: "stocks", label: "Chứng khoán Việt Nam", desc: "VNINDEX, HNX và cổ phiếu niêm yết." },
] as const;

const VOLUMES = [
  { id: "<1k", label: "< 1.000 / tháng" },
  { id: "1k-10k", label: "1k – 10k / tháng" },
  { id: "10k-100k", label: "10k – 100k / tháng" },
  { id: ">100k", label: "> 100k / tháng" },
] as const;

const INTEGRATIONS = [
  { id: "rest", label: "REST — Snapshot" },
  { id: "sse", label: "SSE — Realtime stream" },
  { id: "sdk", label: "SDK TypeScript" },
  { id: "other", label: "Khác / chưa rõ" },
] as const;

interface FormState {
  full_name: string;
  email: string;
  company: string;
  website: string;
  project_name: string;
  project_description: string;
  use_case: string;
  expected_monthly_requests: string;
  scopes: string[];
  integration_type: string;
  agreed_terms: boolean;
}

const EMPTY: FormState = {
  full_name: "",
  email: "",
  company: "",
  website: "",
  project_name: "",
  project_description: "",
  use_case: "",
  expected_monthly_requests: "1k-10k",
  scopes: ["gold"],
  integration_type: "rest",
  agreed_terms: false,
};

function ApiKeyRequestPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (form.full_name.trim().length < 2) e.full_name = "Vui lòng nhập họ và tên (tối thiểu 2 ký tự).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Email chưa hợp lệ.";
    if (form.website.trim() && !/^https?:\/\//i.test(form.website.trim()))
      e.website = "Website phải bắt đầu bằng http(s)://";
    if (form.project_name.trim().length < 2) e.project_name = "Vui lòng nhập tên dự án.";
    if (form.project_description.trim().length < 20)
      e.project_description = "Mô tả dự án cần ít nhất 20 ký tự.";
    if (form.use_case.trim().length < 20) e.use_case = "Use case cần ít nhất 20 ký tự.";
    if (form.scopes.length === 0) e.scopes = "Chọn ít nhất một nhóm dữ liệu.";
    if (!form.agreed_terms) e.agreed_terms = "Bạn cần đồng ý điều khoản sử dụng API.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Vui lòng kiểm tra lại thông tin.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/api-key-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Có lỗi xảy ra, vui lòng thử lại.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      toast.success("Đã gửi yêu cầu — kiểm tra email xác nhận.");
    } catch {
      toast.error("Không kết nối được máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold)]/15">
            <CheckCircle2 className="h-8 w-8 text-[var(--gold)]" />
          </div>
          <h1 className="font-display text-2xl text-foreground md:text-3xl">
            Đã nhận yêu cầu của bạn 🎉
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Email xác nhận đã được gửi tới <strong className="text-foreground">{form.email}</strong>.
            MarketWatch sẽ xem xét trong vòng <strong>1–2 ngày làm việc</strong> và phản hồi kết quả
            tới email của bạn — bao gồm API key đầy đủ nếu được duyệt.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              to="/api-cho-nha-phat-trien"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Xem tài liệu API
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[var(--gold-foreground)] hover:opacity-90"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
      <div className="mb-8">
        <Link
          to="/api-cho-nha-phat-trien"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại tài liệu API
        </Link>
        <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
          <KeyRound className="h-3.5 w-3.5" /> Đăng ký API key
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground md:text-4xl">
          Yêu cầu API key MarketWatch
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Cho chúng tôi biết một chút về dự án của bạn — đội ngũ MarketWatch sẽ duyệt và gửi key qua
          email trong vòng <strong className="text-foreground">1–2 ngày làm việc</strong>.
          Miễn phí cho dự án cá nhân, startup và mục đích nghiên cứu.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { icon: Sparkles, text: "Miễn phí cho dự án nhỏ" },
            { icon: ShieldCheck, text: "Không giới hạn thời gian" },
            { icon: Mail, text: "Phản hồi qua email" },
          ].map((b) => (
            <div
              key={b.text}
              className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground"
            >
              <b.icon className="h-3.5 w-3.5 text-[var(--gold)]" />
              {b.text}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8" noValidate>
        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-display text-lg text-foreground">Thông tin liên hệ</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Họ và tên *" error={errors.full_name} htmlFor="f-name">
              <Input
                id="f-name"
                value={form.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
            </Field>
            <Field label="Email *" error={errors.email} htmlFor="f-email">
              <Input
                id="f-email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="ban@vidu.vn"
                autoComplete="email"
              />
            </Field>
            <Field label="Công ty / tổ chức" error={errors.company} htmlFor="f-company">
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="f-company"
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                  placeholder="Tuỳ chọn"
                  className="pl-8"
                />
              </div>
            </Field>
            <Field label="Website / dự án" error={errors.website} htmlFor="f-website">
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="f-website"
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://vidu.vn"
                  className="pl-8"
                  inputMode="url"
                />
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-display text-lg text-foreground">Về dự án của bạn</h2>
          <div className="mt-5 space-y-4">
            <Field label="Tên dự án *" error={errors.project_name} htmlFor="f-pname">
              <Input
                id="f-pname"
                value={form.project_name}
                onChange={(e) => setField("project_name", e.target.value)}
                placeholder="Ví dụ: Widget giá vàng cho abc.vn"
              />
            </Field>
            <Field
              label="Mô tả dự án *"
              error={errors.project_description}
              htmlFor="f-pdesc"
              hint={`${form.project_description.length}/1500`}
            >
              <Textarea
                id="f-pdesc"
                rows={3}
                maxLength={1500}
                value={form.project_description}
                onChange={(e) => setField("project_description", e.target.value)}
                placeholder="Dự án của bạn là gì? Đối tượng người dùng? Đang chạy ở đâu?"
              />
            </Field>
            <Field
              label="Bạn sẽ dùng dữ liệu cho việc gì? *"
              error={errors.use_case}
              htmlFor="f-usecase"
              hint={`${form.use_case.length}/1500`}
            >
              <Textarea
                id="f-usecase"
                rows={3}
                maxLength={1500}
                value={form.use_case}
                onChange={(e) => setField("use_case", e.target.value)}
                placeholder="Ví dụ: hiển thị giá vàng SJC realtime ở trang chủ, gửi cảnh báo BTC qua Telegram..."
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-display text-lg text-foreground">Phạm vi dữ liệu</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {SCOPES.map((s) => {
              const checked = form.scopes.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    checked
                      ? "border-[var(--gold)] bg-[var(--gold)]/5"
                      : "border-border hover:border-[var(--gold)]/50"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setField(
                        "scopes",
                        v
                          ? [...new Set([...form.scopes, s.id])]
                          : form.scopes.filter((x) => x !== s.id),
                      )
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
          {errors.scopes && <p className="mt-2 text-xs text-[var(--down)]">{errors.scopes}</p>}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <Label className="text-sm">Lượng request dự kiến</Label>
            <RadioGroup
              value={form.expected_monthly_requests}
              onValueChange={(v) => setField("expected_monthly_requests", v)}
              className="mt-3 space-y-2"
            >
              {VOLUMES.map((v) => (
                <label key={v.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value={v.id} id={`v-${v.id}`} />
                  <span className="text-muted-foreground">{v.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <Label className="text-sm">Cách tích hợp dự kiến</Label>
            <RadioGroup
              value={form.integration_type}
              onValueChange={(v) => setField("integration_type", v)}
              className="mt-3 space-y-2"
            >
              {INTEGRATIONS.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value={i.id} id={`i-${i.id}`} />
                  <span className="text-muted-foreground">{i.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={form.agreed_terms}
              onCheckedChange={(v) => setField("agreed_terms", !!v)}
              className="mt-0.5"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              Tôi đồng ý{" "}
              <Link to="/dieu-khoan-su-dung" className="text-[var(--gold)] underline">
                Điều khoản sử dụng
              </Link>{" "}
              và cam kết không lạm dụng API (không spam, không vi phạm rate-limit, ghi nguồn{" "}
              <em>MarketWatch.vn</em> khi hiển thị dữ liệu công khai).
            </span>
          </label>
          {errors.agreed_terms && (
            <p className="mt-2 text-xs text-[var(--down)]">{errors.agreed_terms}</p>
          )}
        </section>

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Bằng cách gửi, bạn xác nhận thông tin trên là chính xác.
          </p>
          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90"
          >
            {submitting ? "Đang gửi…" : "Gửi yêu cầu API key →"}
          </Button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--down)]">{error}</p>}
    </div>
  );
}