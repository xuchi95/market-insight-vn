import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listUsers,
  updateUser,
  banUser,
  sendPasswordReset,
  setUserRole,
  deleteUser,
} from "@/lib/admin/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_admin/mw-admin/users")({
  component: AdminUsersPage,
});

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  locale: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  roles: string[];
};

function AdminUsersPage() {
  const fetchUsers = useServerFn(listUsers);
  const updateFn = useServerFn(updateUser);
  const banFn = useServerFn(banUser);
  const resetFn = useServerFn(sendPasswordReset);
  const roleFn = useServerFn(setUserRole);
  const deleteFn = useServerFn(deleteUser);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => fetchUsers({ data: { page: 1, perPage: 200, search: search || undefined } }),
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  async function handleBan(u: UserRow) {
    const ban = !u.banned_until;
    if (!confirm(ban ? `Cấm ${u.email}?` : `Bỏ cấm ${u.email}?`)) return;
    try {
      await banFn({ data: { userId: u.id, ban } });
      toast.success(ban ? "Đã cấm" : "Đã bỏ cấm");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleRole(u: UserRow) {
    const isAdmin = u.roles.includes("admin");
    try {
      await roleFn({ data: { userId: u.id, role: "admin", grant: !isAdmin } });
      toast.success(isAdmin ? "Đã gỡ admin" : "Đã cấp admin");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleReset(u: UserRow) {
    if (!u.email) return;
    try {
      await resetFn({ data: { email: u.email } });
      toast.success("Đã gửi email reset mật khẩu");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`Xoá vĩnh viễn ${u.email}? Hành động không thể hoàn tác.`)) return;
    try {
      await deleteFn({ data: { userId: u.id } });
      toast.success("Đã xoá");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Người dùng</h1>
          <p className="text-sm text-muted-foreground">Quản lý tài khoản, quyền hạn và mật khẩu.</p>
        </div>
        <Input
          placeholder="Tìm theo email, tên hoặc ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Tên</th>
              <th className="px-3 py-2 text-left">Vai trò</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-left">Đăng nhập lần cuối</th>
              <th className="px-3 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{u.email ?? "—"}</td>
                <td className="px-3 py-2">{u.full_name ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2">
                  {u.roles.includes("admin") ? <Badge>admin</Badge> : <span className="text-muted-foreground">user</span>}
                </td>
                <td className="px-3 py-2">
                  {u.banned_until ? (
                    <Badge variant="destructive">banned</Badge>
                  ) : u.email_confirmed_at ? (
                    <Badge variant="secondary">active</Badge>
                  ) : (
                    <Badge variant="outline">unconfirmed</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("vi-VN") : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}>Sửa</Button>
                    <Button size="sm" variant="outline" onClick={() => handleReset(u)}>Reset MK</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRole(u)}>
                      {u.roles.includes("admin") ? "Gỡ admin" : "Cấp admin"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBan(u)}>
                      {u.banned_until ? "Bỏ cấm" : "Cấm"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(u)}>Xoá</Button>
                  </div>
                </td>
              </tr>
            ))}
            {data && data.users.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">Không có user nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            try {
              await updateFn({ data: { userId: editing.id, ...payload } });
              toast.success("Đã cập nhật");
              setEditing(null);
              refresh();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSave,
}: {
  user: UserRow;
  onClose: () => void;
  onSave: (p: { email?: string; password?: string; fullName?: string | null; locale?: string | null }) => void;
}) {
  const [email, setEmail] = useState(user.email ?? "");
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState(user.locale ?? "vi");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Chỉnh sửa user</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Họ tên</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Mật khẩu mới (để trống nếu không đổi)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự" />
          </div>
          <div>
            <Label>Locale</Label>
            <Input value={locale} onChange={(e) => setLocale(e.target.value)} maxLength={8} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button
            onClick={() =>
              onSave({
                email: email !== user.email ? email : undefined,
                password: password || undefined,
                fullName: fullName !== (user.full_name ?? "") ? fullName : undefined,
                locale: locale !== (user.locale ?? "") ? locale : undefined,
              })
            }
          >Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}