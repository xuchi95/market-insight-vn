import { createFileRoute, Link, Outlet, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, Megaphone, Mail, MessageSquare, Layers, Settings, Search, Fuel } from "lucide-react";

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
  { to: "/mw-admin/users", label: "Người dùng", icon: Users },
  { to: "/mw-admin/popups", label: "Popup", icon: Layers },
  { to: "/mw-admin/broadcasts", label: "Email broadcast", icon: Megaphone },
  { to: "/mw-admin/newsletter", label: "Bản tin", icon: Mail },
  { to: "/mw-admin/contact", label: "Liên hệ", icon: MessageSquare },
  { to: "/mw-admin/seo", label: "SEO Audit", icon: Search },
  { to: "/mw-admin/fuel-prices", label: "Giá xăng VN", icon: Fuel },
  { to: "/mw-admin/settings", label: "Cấu hình", icon: Settings },
] as const;

function AdminShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 p-4">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">MarketWatch</div>
          <div className="font-display text-lg">Admin</div>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
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
      <main className="flex-1 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}