import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listBanAppeals, decideBanAppeal, type BanAppealRow } from "@/lib/admin/ban-appeals.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_admin/mw-admin/ban-appeals")({
  component: BanAppealsPage,
});

type Filter = "pending" | "approved" | "rejected" | "all";

function BanAppealsPage() {
  const listFn = useServerFn(listBanAppeals);
  const [status, setStatus] = useState<Filter>("pending");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ban-appeals", status],
    queryFn: () => listFn({ data: { status, limit: 200 } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "ban-appeals"] });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Kháng nghị tài khoản bị cấm</h1>
          <p className="text-sm text-muted-foreground">Duyệt hoặc từ chối — kết quả sẽ tự gửi email cho user.</p>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="rejected">Đã từ chối</SelectItem>
            <SelectItem value="all">Tất cả</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}
      {!isLoading && data?.appeals.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Không có đơn nào ở trạng thái này.
        </div>
      )}

      <div className="space-y-3">
        {data?.appeals.map((a) => (
          <AppealCard key={a.id} appeal={a} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}

function AppealCard({ appeal, onChanged }: { appeal: BanAppealRow; onChanged: () => void }) {
  const decideFn = useServerFn(decideBanAppeal);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function handle(decision: "approved" | "rejected") {
    if (appeal.status !== "pending") return;
    setBusy(decision === "approved" ? "approve" : "reject");
    try {
      await decideFn({ data: { appealId: appeal.id, decision, adminNote: note.trim() || null } });
      toast.success(decision === "approved" ? "Đã mở khoá và gửi email" : "Đã từ chối và gửi email");
      onChanged();
    } catch (e) {
      toast.error("Lỗi", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  const StatusIcon = appeal.status === "approved" ? CheckCircle2 : appeal.status === "rejected" ? XCircle : Clock;
  const statusColor = appeal.status === "approved" ? "text-emerald-500" : appeal.status === "rejected" ? "text-destructive" : "text-[var(--gold)]";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{appeal.email}</span>
            <Badge variant="outline" className={statusColor}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {appeal.status === "pending" ? "Chờ" : appeal.status === "approved" ? "Đã duyệt" : "Từ chối"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              gửi {new Date(appeal.created_at).toLocaleString("vi-VN")}
              {appeal.ip ? ` · IP ${appeal.ip}` : ""}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{appeal.reason}</p>
          {appeal.admin_note && (
            <div className="mt-3 rounded-md border border-border bg-background/40 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Ghi chú khi xử lý</div>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{appeal.admin_note}</p>
            </div>
          )}
        </div>
      </div>

      {appeal.status === "pending" && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú gửi cho user (tuỳ chọn) — sẽ xuất hiện trong email kết quả."
            rows={2}
            maxLength={2000}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => handle("approved")}
              disabled={!!busy}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {busy === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Duyệt & mở khoá
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handle("rejected")}
              disabled={!!busy}
            >
              {busy === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Từ chối
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}