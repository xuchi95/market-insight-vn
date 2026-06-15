import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Mail,
  MessageSquare,
  Megaphone,
  AlertTriangle,
  Inbox,
  Send,
  Radio,
  TrendingUp,
  Fuel,
  Landmark,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { getDashboardStats } from "@/lib/admin/dashboard.functions";

export const Route = createFileRoute("/_admin/mw-admin/")({
  component: AdminDashboard,
});

type Tone = "default" | "up" | "down" | "primary";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  to,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  to?: string;
}) {
  const toneRing =
    tone === "up"
      ? "ring-1 ring-[var(--up)]/20"
      : tone === "down"
      ? "ring-1 ring-[var(--down)]/25"
      : tone === "primary"
      ? "ring-1 ring-primary/25"
      : "";
  const iconBg =
    tone === "up"
      ? "bg-[var(--up)]/10 text-[var(--up)]"
      : tone === "down"
      ? "bg-[var(--down)]/10 text-[var(--down)]"
      : tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-muted/40 text-muted-foreground";

  const inner = (
    <div
      className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/60 p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${toneRing}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-3xl leading-none text-foreground">{value}</div>
          {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {to && (
        <ArrowUpRight className="absolute right-3 bottom-3 h-3.5 w-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function StatSkeleton() {
  return (
    <div className="h-[112px] animate-pulse rounded-xl border border-border bg-card/40" />
  );
}

function EmailSparkline({ data }: { data: Array<{ date: string; sent: number; failed: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.sent + d.failed));
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { weekday: "short" }).replace("Th ", "T");
  };
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d) => {
        const sentH = (d.sent / max) * 100;
        const failH = (d.failed / max) * 100;
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative flex h-full w-full flex-col-reverse overflow-hidden rounded-md bg-muted/30">
              {d.sent > 0 && (
                <div
                  className="w-full bg-[var(--up)]/70 transition-all"
                  style={{ height: `${sentH}%` }}
                  title={`${d.sent} sent`}
                />
              )}
              {d.failed > 0 && (
                <div
                  className="w-full bg-[var(--down)]/70 transition-all"
                  style={{ height: `${failH}%` }}
                  title={`${d.failed} failed`}
                />
              )}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground">{fmt(d.date)}</div>
          </div>
        );
      })}
    </div>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "bg-[var(--up)]/10 text-[var(--up)] ring-[var(--up)]/30",
    sending: "bg-primary/10 text-primary ring-primary/30",
    queued: "bg-muted/50 text-muted-foreground ring-border",
    draft: "bg-muted/40 text-muted-foreground ring-border",
    failed: "bg-[var(--down)]/10 text-[var(--down)] ring-[var(--down)]/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

function AdminDashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fetchStats(),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Tổng quan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Số liệu nhanh về người dùng, bản tin, email và liên hệ.
          </p>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Cập nhật: {new Date().toLocaleString("vi-VN")}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-[var(--down)]/40 bg-[var(--down)]/5 p-4 text-sm text-[var(--down)]">
          {(error as Error).message}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Tổng user"
              value={data.users.total}
              icon={Users}
              tone="primary"
              to="/mw-admin/users"
            />
            <Stat
              label="Subscriber active"
              value={data.newsletter.active}
              hint={`+${data.newsletter.new7d} mới · ${data.newsletter.unsubscribed} đã huỷ`}
              icon={Inbox}
              tone="up"
              to="/mw-admin/newsletter"
            />
            <Stat
              label="Popup đang bật"
              value={data.popups.active}
              icon={Megaphone}
              to="/mw-admin/popups"
            />
            <Stat
              label="Liên hệ chưa đọc"
              value={data.contact.unread}
              hint={`/ ${data.contact.total} tổng`}
              icon={MessageSquare}
              tone={data.contact.unread > 0 ? "down" : "default"}
              to="/mw-admin/contact"
            />
            <Stat
              label="Email gửi 24h"
              value={data.emails.sent24h}
              icon={Send}
              tone="up"
            />
            <Stat
              label="Email lỗi 24h"
              value={data.emails.failed24h}
              icon={AlertTriangle}
              tone={data.emails.failed24h > 0 ? "down" : "default"}
            />
            <Stat
              label="DLQ 7 ngày"
              value={data.emails.dlq7d}
              icon={Mail}
              tone={data.emails.dlq7d > 0 ? "down" : "default"}
            />
            <Stat
              label="Broadcast đã tạo"
              value={data.broadcasts.total}
              icon={Radio}
              to="/mw-admin/broadcasts"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Email chart */}
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base text-foreground">Email 7 ngày</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tổng quan gửi thành công và lỗi theo ngày.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-[var(--up)]/70" /> Sent
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-[var(--down)]/70" /> Failed
                  </span>
                </div>
              </div>
              <EmailSparkline data={data.emailSeries} />
            </div>

            {/* Quick links */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-display text-base text-foreground">Truy cập nhanh</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { to: "/mw-admin/broadcasts", label: "Gửi broadcast", icon: Radio },
                  { to: "/mw-admin/newsletter", label: "Bản tin", icon: Inbox },
                  { to: "/mw-admin/contact", label: "Liên hệ", icon: MessageSquare },
                  { to: "/mw-admin/popups", label: "Popup", icon: Megaphone },
                  { to: "/mw-admin/fuel-prices", label: "Giá xăng", icon: Fuel },
                  { to: "/mw-admin/savings-rates", label: "Lãi suất TK", icon: Landmark },
                  { to: "/mw-admin/settings", label: "Cấu hình", icon: Sparkles },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-foreground transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <l.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    <span className="truncate">{l.label}</span>
                  </Link>
                ))}
              </div>
              {data.fuel && (
                <div className="mt-4 rounded-lg border border-dashed border-border bg-background/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="h-3 w-3" />
                    <span className="font-medium text-foreground">Giá xăng</span>
                  </div>
                  <div className="mt-1">
                    Hiệu lực: {new Date(data.fuel.effective_at).toLocaleString("vi-VN")}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recent contacts */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base text-foreground">Liên hệ gần đây</h2>
                </div>
                <Link
                  to="/mw-admin/contact"
                  className="text-xs text-primary hover:underline"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="divide-y divide-border">
                {data.recentContacts.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Chưa có liên hệ nào.
                  </div>
                )}
                {data.recentContacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${c.read_at ? "bg-muted-foreground/30" : "bg-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-medium text-foreground">
                          {c.name || c.email}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {relTime(c.created_at)}
                        </div>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.subject || c.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent broadcasts */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base text-foreground">Broadcast gần đây</h2>
                </div>
                <Link
                  to="/mw-admin/broadcasts"
                  className="text-xs text-primary hover:underline"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="divide-y divide-border">
                {data.recentBroadcasts.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Chưa có broadcast nào.
                  </div>
                )}
                {data.recentBroadcasts.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-medium text-foreground">
                          {b.subject}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {relTime(b.created_at)}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusBadge status={b.status} />
                        {b.sent_count != null && <span>· {b.sent_count} đã gửi</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}