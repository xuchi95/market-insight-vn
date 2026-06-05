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
  getAiPredictSettings,
  updateAiPredictSettings,
} from "@/lib/admin/settings.functions";
import { detectAiRegion } from "@/lib/ai-predict.functions";
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
  const getAiFn = useServerFn(getAiPredictSettings);
  const updateAiFn = useServerFn(updateAiPredictSettings);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => getFn() });
  const { data: audit } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => auditFn() });
  const { data: ai } = useQuery({ queryKey: ["admin", "ai-predict"], queryFn: () => getAiFn() });
  const detectFn = useServerFn(detectAiRegion);
  const { data: region, refetch: refetchRegion, isFetching: detecting } = useQuery({
    queryKey: ["admin", "ai-region"],
    queryFn: () => detectFn(),
  });

  const [batch, setBatch] = useState(10);
  const [delay, setDelay] = useState(200);
  const [authTtl, setAuthTtl] = useState(15);
  const [txTtl, setTxTtl] = useState(60);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("manual");
  const [aiModel, setAiModel] = useState<string>("");
  const [aiBaseUrl, setAiBaseUrl] = useState<string>("");

  useEffect(() => {
    if (ai?.predict_model) setAiModel(ai.predict_model);
    setAiBaseUrl(ai?.api_base_url ?? "");
  }, [ai?.predict_model]);

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
        <h2 className="mb-1 font-display text-lg">AI dự đoán giá</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Chọn mô hình OpenRouter dùng cho công cụ <code>/du-doan-gia-ai</code>. Người dùng không thấy lựa chọn này.
        </p>
        <div className="space-y-2">
          {ai?.models.map((m) => {
            const active = aiModel === m.id;
            return (
              <label
                key={m.id}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="ai-model"
                  value={m.id}
                  checked={active}
                  onChange={() => setAiModel(m.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{m.label}</span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/70 mt-1">{m.id}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={async () => {
              if (!aiModel) return;
              try {
                const trimmed = aiBaseUrl.trim();
                await updateAiFn({
                  data: {
                    predict_model: aiModel,
                    api_base_url: trimmed.length > 0 ? trimmed : null,
                  },
                });
                toast.success("Đã lưu mô hình AI");
                qc.invalidateQueries({ queryKey: ["admin", "ai-predict"] });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            disabled={
              !aiModel ||
              (aiModel === ai?.predict_model &&
                (aiBaseUrl.trim() || null) === (ai?.api_base_url ?? null))
            }
          >
            Lưu mô hình AI
          </Button>
          {ai?.updated_at && (
            <span className="text-xs text-muted-foreground">
              Cập nhật: {new Date(ai.updated_at).toLocaleString("vi-VN")}
            </span>
          )}
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <Label className="text-sm">Endpoint API (proxy theo khu vực)</Label>
          <div className="mb-3 mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Button size="sm" variant="outline" onClick={() => refetchRegion()} disabled={detecting}>
              {detecting ? "Đang kiểm tra…" : "Phát hiện vùng máy chủ"}
            </Button>
            {region?.region && (
              <span className="rounded border border-border px-2 py-0.5 font-mono">
                Vùng: {region.region}
              </span>
            )}
            {region?.has_custom_proxy && (
              <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
                Đang dùng proxy tuỳ chỉnh
              </span>
            )}
          </div>
          {region?.suggestion && (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              ⚠ {region.suggestion}
            </div>
          )}
          <Input
            value={aiBaseUrl}
            onChange={(e) => setAiBaseUrl(e.target.value)}
            placeholder={ai?.default_api_base_url ?? "https://openrouter.ai/api/v1"}
            className="mt-1 font-mono text-xs"
          />
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Để trống nếu dùng OpenRouter mặc định ({ai?.default_api_base_url ?? "https://openrouter.ai/api/v1"}).
            Một số mô hình (GPT, Claude) bị chặn theo khu vực — nếu muốn dùng, hãy đặt
            URL của proxy OpenAI-compatible đặt tại Mỹ/EU (ví dụ:{" "}
            <code className="text-foreground">https://your-proxy.example.com/v1</code>).
            URL không có dấu <code>/</code> ở cuối, và endpoint <code>/chat/completions</code> sẽ được thêm tự động.
          </p>
        </div>
      </section>

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