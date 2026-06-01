import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getSystemSettings,
  updateSystemSettings,
  addSuppressedEmail,
  removeSuppressedEmail,
  recentAuditLog,
} from "@/lib/admin/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_admin/mw-admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const getFn = useServerFn(getSystemSettings);
  const updateFn = useServerFn(updateSystemSettings);
  const addFn = useServerFn(addSuppressedEmail);
  const removeFn = useServerFn(removeSuppressedEmail);
  const auditFn = useServerFn(recentAuditLog);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => getFn() });
  const { data: audit } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => auditFn() });

  const [batch, setBatch] = useState(10);
  const [delay, setDelay] = useState(200);
  const [authTtl, setAuthTtl] = useState(15);
  const [txTtl, setTxTtl] = useState(60);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("manual");

  useEffect(() => {
    if (data?.state) {
      setBatch(data.state.batch_size);
      setDelay(data.state.send_delay_ms);
      setAuthTtl(data.state.auth_email_ttl_minutes);
      setTxTtl(data.state.transactional_email_ttl_minutes);
    }
  }, [data?.state]);

  async function save() {
    try {
      await updateFn({ data: { batch_size: batch, send_delay_ms: delay, auth_email_ttl_minutes: authTtl, transactional_email_ttl_minutes: txTtl } });
      toast.success("Đã lưu cấu hình");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Cấu hình hệ thống</h1>
        <p className="text-sm text-muted-foreground">Tham số email worker và suppression list.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg">Email worker</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <Label>Batch size</Label>
            <Input type="number" value={batch} onChange={(e) => setBatch(Number(e.target.value))} />
          </div>
          <div>
            <Label>Send delay (ms)</Label>
            <Input type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
          </div>
          <div>
            <Label>Auth email TTL (phút)</Label>
            <Input type="number" value={authTtl} onChange={(e) => setAuthTtl(Number(e.target.value))} />
          </div>
          <div>
            <Label>Transactional TTL (phút)</Label>
            <Input type="number" value={txTtl} onChange={(e) => setTxTtl(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={save}>Lưu cấu hình</Button>
          {data?.state?.retry_after_until && (
            <span className="ml-3 text-xs text-muted-foreground">
              Đang tạm dừng đến {new Date(data.state.retry_after_until).toLocaleString("vi-VN")}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg">Suppression list</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <Label>Email</Label>
            <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="w-40">
            <Label>Lý do</Label>
            <Input value={newReason} onChange={(e) => setNewReason(e.target.value)} />
          </div>
          <Button onClick={async () => {
            if (!newEmail) return;
            try { await addFn({ data: { email: newEmail, reason: newReason } }); setNewEmail(""); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); }
            catch (e) { toast.error((e as Error).message); }
          }}>Thêm</Button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Lý do</th><th className="px-3 py-2 text-left">Ngày</th><th /></tr>
            </thead>
            <tbody>
              {data?.suppressed.map((s) => (
                <tr key={s.id} className="border-t border-border/50">
                  <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                  <td className="px-3 py-2 text-xs">{s.reason}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { await removeFn({ data: { id: s.id } }); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); }
                      catch (e) { toast.error((e as Error).message); }
                    }}>Gỡ</Button>
                  </td>
                </tr>
              ))}
              {data && data.suppressed.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">Trống.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg">Audit log</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Thời gian</th><th className="px-3 py-2 text-left">Admin</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Target</th></tr>
            </thead>
            <tbody>
              {audit?.entries.map((a) => (
                <tr key={a.id} className="border-t border-border/40">
                  <td className="px-3 py-1.5 text-muted-foreground">{new Date(a.created_at).toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-1.5 font-mono">{a.admin_id.slice(0, 8)}</td>
                  <td className="px-3 py-1.5">{a.action}</td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{a.target_type}/{a.target_id?.slice(0, 12)}</td>
                </tr>
              ))}
              {audit && audit.entries.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Trống.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}