import { createFileRoute, Link, Outlet, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Users, Megaphone, Mail, MailOpen, MessageSquare, Layers, Settings, Search,
  Fuel, Code2, TrendingUp, KeyRound, ShieldCheck, Inbox, Newspaper, BarChart3, Activity, Gavel,
  Menu, X, ChevronLeft, ChevronRight, LogOut, ExternalLink, Bell, User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_admin")({
  component: AdminGate,
  head: () => ({
    meta: [
      { title: "Admin · MarketWatch" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
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
  return <AdminShell email={user.email ?? ""} />;
}

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { to: "/mw-admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/mw-admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/mw-admin/cron-activity", label: "Hoạt động cron", icon: Activity },
    ],
  },
  {
    label: "Người dùng",
    items: [
      { to: "/mw-admin/users", label: "Người dùng", icon: Users },
      { to: "/mw-admin/ban-appeals", label: "Kháng nghị cấm", icon: Gavel },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { to: "/mw-admin/popups", label: "Popup", icon: Layers },
      { to: "/mw-admin/newsletter", label: "Bản tin", icon: Mail },
      { to: "/mw-admin/broadcasts", label: "Email broadcast", icon: Megaphone },
      { to: "/mw-admin/email-preview", label: "Preview email", icon: MailOpen },
      { to: "/mw-admin/contact", label: "Liên hệ", icon: MessageSquare },
    ],
  },
  {
    label: "Công cụ",
    items: [
      { to: "/mw-admin/seo", label: "SEO Audit", icon: Search },
      { to: "/mw-admin/fuel-prices", label: "Giá xăng VN", icon: Fuel },
      { to: "/mw-admin/fuel-prices/history", label: "Lịch sử giá xăng", icon: Fuel },
      { to: "/mw-admin/code-injection", label: "Chèn mã HTML", icon: Code2 },
      { to: "/mw-admin/price-settings", label: "Cấu hình % giá", icon: TrendingUp },
      { to: "/mw-admin/news-settings", label: "Nguồn tin crypto", icon: Newspaper },
    ],
  },
  {
    label: "Bảo mật & API",
    items: [
      { to: "/mw-admin/api-keys", label: "API Keys", icon: KeyRound },
      { to: "/mw-admin/api-key-requests", label: "Yêu cầu API key", icon: Inbox },
      { to: "/mw-admin/verify-otp-stats", label: "Verify OTP stats", icon: ShieldCheck },
    ],
  },
  {
    label: "Hệ thống",
    items: [{ to: "/mw-admin/settings", label: "Cấu hình", icon: Settings }],
  },
];

function AdminShell({ email }: { email: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("mw-admin-collapsed") === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mw-admin-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const sidebarWidth = collapsed ? "md:w-14" : "md:w-[200px]";
  const mainPad = collapsed ? "md:pl-14" : "md:pl-[200px]";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top admin bar (WP-style) */}
      <header
        className="fixed inset-x-0 top-0 z-40 flex h-11 items-center justify-between border-b border-border/60 bg-card text-card-foreground px-3 text-sm"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-foreground/80 hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Mở menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden rounded-md p-2 text-foreground/80 hover:bg-accent hover:text-foreground md:inline-flex"
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <Link
            to="/"
            className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-foreground/85 hover:bg-accent hover:text-[var(--gold)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Xem site</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/mw-admin/contact"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-foreground/80 hover:bg-accent hover:text-foreground"
            aria-label="Liên hệ"
          >
            <Bell className="h-3.5 w-3.5" />
          </Link>
          <div className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/85 sm:flex">
            <UserIcon className="h-3.5 w-3.5 text-[var(--gold)]" />
            <span className="max-w-[180px] truncate">{email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground/85 hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — WordPress-style persistent left rail */}
      <aside
        className={`fixed inset-y-0 left-0 top-11 z-50 w-[220px] overflow-y-auto border-r border-border/60 bg-card text-card-foreground transition-[width,transform] md:translate-x-0 ${sidebarWidth} ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-[var(--gold)]">
              MarketWatch
            </div>
            <div className="font-display text-sm leading-tight">Admin</div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-foreground/80 hover:text-foreground"
            aria-label="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!collapsed && (
          <div className="hidden border-b border-border/40 px-4 py-3 md:block">
            <div className="text-[9px] uppercase tracking-[0.22em] text-[var(--gold)]">
              MarketWatch
            </div>
            <div className="font-display text-sm leading-tight">Bảng điều khiển</div>
          </div>
        )}

        <nav className="py-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-2 border-t border-border/30 pt-2" : ""}>
              {!collapsed && (
                <div className="px-4 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </div>
              )}
              <div>
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    activeOptions={{ exact: item.to === "/mw-admin" }}
                    activeProps={{
                      className:
                        "bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] text-[var(--gold)] border-l-[var(--gold)]",
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-3 border-l-2 border-transparent px-4 py-2 text-[13px] text-foreground/85 transition-colors hover:bg-accent hover:text-foreground ${
                      collapsed ? "md:justify-center md:px-0" : ""
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className={`min-w-0 pt-11 transition-[padding] ${mainPad}`}>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}