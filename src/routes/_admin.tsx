import { createFileRoute, Link, Outlet, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, Megaphone, Mail, MailOpen, MessageSquare, Layers, Settings, Search, Fuel, Code2, TrendingUp, KeyRound, ShieldCheck, Inbox, Newspaper, BarChart3, Menu, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_admin")({
  component: AdminGate,
});

function AdminGate() {
  const { user, loading } = useAuth();

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    enabled: !!user,
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  if (loading || (user && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Đang kiểm tra quyền…
      </div>
    );
  }
  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminShell />;
}

const NAV = [
  { to: "/mw-admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mw-admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/mw-admin/users", label: "Người dùng", icon: Users },
  { to: "/mw-admin/popups", label: "Popup", icon: Layers },
  { to: "/mw-admin/broadcasts", label: "Email broadcast", icon: Megaphone },
  { to: "/mw-admin/email-preview", label: "Preview email", icon: MailOpen },
  { to: "/mw-admin/newsletter", label: "Bản tin", icon: Mail },
  { to: "/mw-admin/contact", label: "Liên hệ", icon: MessageSquare },
  { to: "/mw-admin/seo", label: "SEO Audit", icon: Search },
  { to: "/mw-admin/fuel-prices", label: "Giá xăng VN", icon: Fuel },
  { to: "/mw-admin/fuel-prices/history", label: "Lịch sử giá xăng", icon: Fuel },
  { to: "/mw-admin/code-injection", label: "Chèn mã HTML", icon: Code2 },
  { to: "/mw-admin/price-settings", label: "Cấu hình % giá", icon: TrendingUp },
  { to: "/mw-admin/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/mw-admin/api-key-requests", label: "Yêu cầu API key", icon: Inbox },
  { to: "/mw-admin/verify-otp-stats", label: "Verify OTP stats", icon: ShieldCheck },
  { to: "/mw-admin/news-settings", label: "Nguồn tin crypto", icon: Newspaper },
  { to: "/mw-admin/settings", label: "Cấu hình", icon: Settings },
] as const;

function AdminShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:hidden">
        <div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-[var(--gold)]">MarketWatch</div>
          <div className="font-display text-sm leading-tight">Admin</div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-border bg-card p-4 transition-transform md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 md:bg-card/40 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">MarketWatch</div>
              <div className="font-display text-lg">Admin</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden"
              aria-label="Đóng menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: item.to === "/mw-admin" }}
              activeProps={{ className: "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-[var(--gold)]" }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Link to="/" className="mt-6 block text-xs text-muted-foreground hover:text-foreground">← Về site</Link>
      </aside>
      <main className="min-w-0 flex-1 p-4 pt-16 md:p-8 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}