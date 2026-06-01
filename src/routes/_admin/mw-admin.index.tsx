import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/admin/dashboard.functions";

export const Route = createFileRoute("/_admin/mw-admin/")({
  component: AdminDashboard,
});

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function AdminDashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fetchStats(),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-foreground">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Số liệu nhanh về user, bản tin, email và liên hệ.</p>
      </div>
      {isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}
      {error && <div className="rounded-md border border-[var(--down)]/40 bg-[var(--down)]/5 p-4 text-sm text-[var(--down)]">{(error as Error).message}</div>}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Tổng user" value={data.users.total} />
          <Stat label="Subscriber active" value={data.newsletter.active} hint={`${data.newsletter.unsubscribed} đã huỷ`} />
          <Stat label="Popup đang bật" value={data.popups.active} />
          <Stat label="Liên hệ chưa đọc" value={data.contact.unread} hint={`/${data.contact.total} tổng`} />
          <Stat label="Email gửi 24h" value={data.emails.sent24h} />
          <Stat label="Email lỗi 24h" value={data.emails.failed24h} />
          <Stat label="DLQ 7 ngày" value={data.emails.dlq7d} />
        </div>
      )}
      <div className="mt-8 rounded-lg border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">Phần tiếp theo</div>
        <p className="mt-1">Các trang con (Người dùng, Popup, Broadcast, Bản tin, Liên hệ, Cấu hình) đã có server functions sẵn sàng. UI chi tiết sẽ được dựng trong lượt kế tiếp.</p>
      </div>
    </div>
  );
}