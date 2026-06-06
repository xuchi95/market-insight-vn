import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2, ExternalLink, Mail, Building2 } from "lucide-react";
import {
  listApiKeyRequests,
  approveApiKeyRequest,
  rejectApiKeyRequest,
  deleteApiKeyRequest,
} from "@/lib/admin/api-key-requests.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_admin/mw-admin/api-key-requests")({
  component: ApiKeyRequestsPage,
});

const ALL_SCOPES = ["gold", "crypto", "fuel", "stocks"] as const;
const SCOPE_LABEL: Record<string, string> = {
  gold: "Vàng",
  crypto: "Crypto",
  fuel: "Xăng",
  stocks: "Chứng khoán",
};
const STATUSES = [
  { id: "pending", label: "Đang chờ" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối" },
  { id: "all", label: "Tất cả" },
] as const;

function ApiKeyRequestsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listApiKeyRequests);
  const approve = useServerFn(approveApiKeyRequest);
  const reject = useServerFn(rejectApiKeyRequest);
  const del = useServerFn(deleteApiKeyRequest);

  const [status, setStatus] = useState<(typeof STATUSES)[number]["id"]>("pending");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "api-key-requests", status],
    queryFn: () => list({ data: { status } }),
  });

  const [approveTarget, setApproveTarget] = useState<null | {
    id: string;
    project_name: string;
    email: string;
    scopes: string[];
  }>(null);
  const [rejectTarget, setRejectTarget] = useState<null | {
    id: string;
    project_name: string;
    email: string;
  }>(null);

  const approveMut = useMutation({
    mutationFn: (v: { id: string; scopes: string[]; admin_notes?: string }) =>
      approve({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "api-key-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "api-keys"] });
      setApproveTarget(null);
      toast.success("Đã duyệt — email kèm key đã gửi cho người dùng.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rejectMut = useMutation({
    mutationFn: (v: { id: string; rejection_reason: string }) => reject({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "api-key-requests"] });
      setRejectTarget(null);
      toast.success("Đã gửi email từ chối.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "api-key-requests"] });
      toast.success("Đã xoá");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Yêu cầu API key</h1>
        <p className="text-sm text-muted-foreground">
          Duyệt/từ chối các yêu cầu cấp API key gửi từ form công khai. Email tự gửi qua{" "}
          <code>api@marketwatch.vn</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatus(s.id)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              status === s.id
                ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Đang tải…
          </div>
        )}
        {data && data.items.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Không có yêu cầu nào ở trạng thái này.
          </div>
        )}
        {data?.items.map((r: any) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-foreground">{r.project_name}</div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {r.full_name} · {r.email}
                  </span>
                  {r.company && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {r.company}
                    </span>
                  )}
                  {r.website && (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--gold)] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {r.website}
                    </a>
                  )}
                  <span>{new Date(r.created_at).toLocaleString("vi-VN")}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(r.scopes ?? []).map((s: string) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {SCOPE_LABEL[s] ?? s}
                    </Badge>
                  ))}
                  {r.expected_monthly_requests && (
                    <Badge variant="outline" className="text-[10px]">
                      {r.expected_monthly_requests}
                    </Badge>
                  )}
                  {r.integration_type && (
                    <Badge variant="outline" className="text-[10px]">
                      {r.integration_type.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setApproveTarget({
                        id: r.id,
                        project_name: r.project_name,
                        email: r.email,
                        scopes: r.scopes ?? [],
                      })
                    }
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRejectTarget({
                        id: r.id,
                        project_name: r.project_name,
                        email: r.email,
                      })
                    }
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Từ chối
                  </Button>
                </div>
              )}
              {r.status !== "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Xoá yêu cầu này?")) deleteMut.mutate(r.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Mô tả dự án
                </div>
                <div className="mt-1 whitespace-pre-wrap text-foreground/90">
                  {r.project_description}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Use case
                </div>
                <div className="mt-1 whitespace-pre-wrap text-foreground/90">{r.use_case}</div>
              </div>
            </div>

            {r.admin_notes && (
              <div className="mt-3 rounded-md border border-emerald-600/30 bg-emerald-600/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <strong>Ghi chú admin:</strong> {r.admin_notes}
              </div>
            )}
            {r.rejection_reason && (
              <div className="mt-3 rounded-md border border-[var(--down)]/30 bg-[var(--down)]/5 p-3 text-xs text-[var(--down)]">
                <strong>Lý do từ chối:</strong> {r.rejection_reason}
              </div>
            )}
          </div>
        ))}
      </div>

      <ApproveDialog
        target={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSubmit={(v) => approveMut.mutate(v)}
        loading={approveMut.isPending}
      />
      <RejectDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={(v) => rejectMut.mutate(v)}
        loading={rejectMut.isPending}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Đã duyệt</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Từ chối</Badge>;
  return <Badge className="bg-[var(--gold)] text-[var(--gold-foreground)]">Đang chờ</Badge>;
}

function ApproveDialog({
  target,
  onClose,
  onSubmit,
  loading,
}: {
  target: { id: string; project_name: string; email: string; scopes: string[] } | null;
  onClose: () => void;
  onSubmit: (v: { id: string; scopes: string[]; admin_notes?: string }) => void;
  loading: boolean;
}) {
  const [scopes, setScopes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // sync khi mở dialog
  if (target && scopes.length === 0 && target.scopes.length > 0 && notes === "") {
    // chạy một lần khi target thay đổi
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setScopes([]);
          setNotes("");
        } else if (target) {
          setScopes(target.scopes);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duyệt yêu cầu</DialogTitle>
          <DialogDescription>
            Email kèm API key sẽ tự động gửi tới <strong>{target?.email}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Quyền cấp</div>
            <div className="flex flex-wrap gap-3">
              {ALL_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes(s)}
                    onCheckedChange={(c) =>
                      setScopes((prev) =>
                        c ? [...new Set([...prev, s])] : prev.filter((x) => x !== s),
                      )
                    }
                  />
                  {SCOPE_LABEL[s]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Ghi chú gửi cho user (tuỳ chọn)
            </div>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Ví dụ: chúc dự án thành công, vui lòng ghi nguồn marketwatch.vn..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Huỷ
          </Button>
          <Button
            disabled={loading || scopes.length === 0 || !target}
            onClick={() =>
              target &&
              onSubmit({ id: target.id, scopes, admin_notes: notes.trim() || undefined })
            }
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {loading ? "Đang duyệt…" : "Duyệt & gửi key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  target,
  onClose,
  onSubmit,
  loading,
}: {
  target: { id: string; project_name: string; email: string } | null;
  onClose: () => void;
  onSubmit: (v: { id: string; rejection_reason: string }) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setReason("");
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Từ chối yêu cầu</DialogTitle>
          <DialogDescription>
            Lý do dưới đây sẽ được gửi qua email tới <strong>{target?.email}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          placeholder="Ví dụ: Thông tin dự án chưa đủ rõ, vui lòng bổ sung URL demo và mô tả use case cụ thể hơn..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={loading || reason.trim().length < 5 || !target}
            onClick={() => target && onSubmit({ id: target.id, rejection_reason: reason.trim() })}
          >
            {loading ? "Đang gửi…" : "Từ chối & gửi email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}