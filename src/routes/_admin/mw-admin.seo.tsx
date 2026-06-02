import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSeoAuditOverview, runSeoAuditNow } from "@/lib/admin/seo-audit.functions";
import { AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, TrendingUp, FileCode } from "lucide-react";

export const Route = createFileRoute("/_admin/mw-admin/seo")({
  component: SeoAuditPage,
});

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return iso;
  }
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-card p-5 ${className}`}>{children}</div>;
}

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "ok" | "warn" | "down" }) {
  const color =
    tone === "ok" ? "text-[var(--gold)]" : tone === "warn" ? "text-amber-400" : tone === "down" ? "text-[var(--down)]" : "text-foreground";
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function SeoAuditPage() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getSeoAuditOverview);
  const runNow = useServerFn(runSeoAuditNow);
  const [filter, setFilter] = useState<"all" | "issues">("issues");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "seo-audit"],
    queryFn: () => fetchOverview(),
  });

  const runMutation = useMutation({
    mutationFn: () => runNow(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "seo-audit"] }),
  });

  const latest = data?.latest;
  const latestResults = data?.latestResults ?? [];
  const filtered = filter === "issues" ? latestResults.filter((r: any) => (r.issues ?? []).length > 0) : latestResults;

  const sitemapStatus: any[] = Array.isArray(latest?.sitemap_status) ? (latest.sitemap_status as any[]) : [];
  const sitemapError = latest?.sitemap_status && typeof latest.sitemap_status === "object" && "_error" in (latest.sitemap_status as any)
    ? (latest.sitemap_status as any)._error : null;
  const perf: any = latest?.search_perf && typeof latest.search_perf === "object" ? latest.search_perf : null;
  const perfError = perf && "_error" in perf ? perf._error : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">SEO Audit</h1>
          <p className="text-sm text-muted-foreground">
            Tổng hợp cảnh báo từ Google Search Console (AMP / canonical / index / robots). Cron tự chạy mỗi ngày 03:00 ICT.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="mr-1 inline h-3 w-3" /> Tải lại
          </button>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="rounded-md bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {runMutation.isPending ? "Đang chạy…" : "Chạy audit ngay"}
          </button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}
      {error && (
        <div className="rounded-md border border-[var(--down)]/40 bg-[var(--down)]/5 p-4 text-sm text-[var(--down)]">
          {(error as Error).message}
        </div>
      )}
      {runMutation.isError && (
        <div className="mb-4 rounded-md border border-[var(--down)]/40 bg-[var(--down)]/5 p-4 text-sm text-[var(--down)]">
          Không chạy được audit: {(runMutation.error as Error).message}
        </div>
      )}
      {runMutation.isSuccess && (
        <div className="mb-4 rounded-md border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-4 text-sm text-foreground">
          Audit hoàn tất: {runMutation.data.total} URL, {runMutation.data.withIssues} có vấn đề.
        </div>
      )}

      {data && !latest && (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Chưa có lần audit nào. Bấm <strong>Chạy audit ngay</strong> để bắt đầu.
        </div>
      )}

      {data && latest && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Lần audit gần nhất"
              value={fmtDate(latest.started_at)}
              hint={`Trạng thái: ${latest.status}`}
            />
            <Stat
              label="URL đã kiểm tra"
              value={latest.total_urls ?? 0}
              hint="Từ sitemap.xml"
            />
            <Stat
              label="URL có vấn đề"
              value={latest.urls_with_issues ?? 0}
              tone={latest.urls_with_issues > 0 ? "down" : "ok"}
              hint={`/${latest.total_urls ?? 0} tổng`}
            />
            <Stat
              label="Search 28 ngày"
              value={perf && !perfError ? `${perf.clicks.toLocaleString("vi-VN")} click` : "—"}
              tone="ok"
              hint={perfError ? "Lỗi: xem chi tiết" : perf ? `${perf.impressions.toLocaleString("vi-VN")} impressions • CTR ${(perf.ctr * 100).toFixed(2)}%` : undefined}
            />
          </div>

          {latest.error_message && (
            <div className="mt-4 rounded-md border border-[var(--down)]/40 bg-[var(--down)]/5 p-4 text-sm text-[var(--down)]">
              <strong>Lần chạy lỗi:</strong> {latest.error_message}
            </div>
          )}

          {/* Diff so với lần trước */}
          {data.previous && (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h2 className="font-display text-sm uppercase tracking-[0.2em] text-emerald-400">Lỗi đã biến mất</h2>
                  <span className="ml-auto text-xs text-muted-foreground">vs lần trước ({fmtDate(data.previous.started_at)})</span>
                </div>
                {data.disappeared.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có thay đổi nào.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.disappeared.map((d: any) => (
                      <li key={d.url} className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-foreground hover:text-[var(--gold)]">
                          {d.url} <ExternalLink className="inline h-3 w-3" />
                        </a>
                        <ul className="mt-1 ml-3 text-xs text-emerald-400">
                          {d.issues.map((i: string, idx: number) => <li key={idx}>✓ {i}</li>)}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h2 className="font-display text-sm uppercase tracking-[0.2em] text-amber-400">Lỗi mới xuất hiện</h2>
                </div>
                {data.newlyAppeared.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có lỗi mới.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.newlyAppeared.map((d: any) => (
                      <li key={d.url} className="rounded border border-amber-500/20 bg-amber-500/5 p-2">
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-foreground hover:text-[var(--gold)]">
                          {d.url} <ExternalLink className="inline h-3 w-3" />
                        </a>
                        <ul className="mt-1 ml-3 text-xs text-amber-400">
                          {d.issues.map((i: string, idx: number) => <li key={idx}>⚠ {i}</li>)}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}

          {/* Sitemap status */}
          <Card className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-[var(--gold)]" />
              <h2 className="font-display text-sm uppercase tracking-[0.2em] text-foreground">Sitemap đã submit</h2>
            </div>
            {sitemapError && <div className="text-sm text-[var(--down)]">Lỗi: {sitemapError}</div>}
            {!sitemapError && sitemapStatus.length === 0 && (
              <p className="text-sm text-muted-foreground">Chưa có sitemap nào được submit lên GSC.</p>
            )}
            {!sitemapError && sitemapStatus.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-2 pr-3">Sitemap</th><th className="py-2 pr-3">Submit</th><th className="py-2 pr-3">Tải xuống</th><th className="py-2 pr-3">Errors</th><th className="py-2">Warnings</th></tr>
                  </thead>
                  <tbody>
                    {sitemapStatus.map((s, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-2 pr-3 text-foreground">{s.path}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{fmtDate(s.lastSubmitted)}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{fmtDate(s.lastDownloaded)}</td>
                        <td className={`py-2 pr-3 ${s.errors > 0 ? "text-[var(--down)]" : "text-muted-foreground"}`}>{s.errors}</td>
                        <td className={`py-2 ${s.warnings > 0 ? "text-amber-400" : "text-muted-foreground"}`}>{s.warnings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Search performance */}
          {perf && !perfError && (
            <Card className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--gold)]" />
                <h2 className="font-display text-sm uppercase tracking-[0.2em] text-foreground">Hiệu suất search — 28 ngày</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><div className="text-[10px] uppercase text-muted-foreground">Clicks</div><div className="font-display text-xl">{perf.clicks.toLocaleString("vi-VN")}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Impressions</div><div className="font-display text-xl">{perf.impressions.toLocaleString("vi-VN")}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">CTR</div><div className="font-display text-xl">{(perf.ctr * 100).toFixed(2)}%</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Vị trí TB</div><div className="font-display text-xl">{perf.position.toFixed(1)}</div></div>
              </div>
            </Card>
          )}

          {/* URL list */}
          <Card className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm uppercase tracking-[0.2em] text-foreground">Chi tiết URL ({filtered.length}/{latestResults.length})</h2>
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setFilter("issues")}
                  className={`rounded-md border px-2 py-1 ${filter === "issues" ? "border-[var(--gold)] text-[var(--gold)]" : "border-border text-muted-foreground"}`}
                >
                  Chỉ có vấn đề
                </button>
                <button
                  onClick={() => setFilter("all")}
                  className={`rounded-md border px-2 py-1 ${filter === "all" ? "border-[var(--gold)] text-[var(--gold)]" : "border-border text-muted-foreground"}`}
                >
                  Tất cả
                </button>
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-emerald-400">
                <CheckCircle2 className="inline h-4 w-4" /> Không có URL nào bị lỗi 🎉
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">URL</th>
                      <th className="py-2 pr-3">Verdict</th>
                      <th className="py-2 pr-3">Coverage</th>
                      <th className="py-2 pr-3">Robots</th>
                      <th className="py-2 pr-3">AMP</th>
                      <th className="py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any) => (
                      <tr key={r.url} className="border-t border-border align-top">
                        <td className="py-2 pr-3 max-w-[260px] break-all">
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-foreground hover:text-[var(--gold)]">{r.url}</a>
                        </td>
                        <td className={`py-2 pr-3 ${r.verdict === "PASS" ? "text-emerald-400" : r.verdict === "FAIL" ? "text-[var(--down)]" : "text-muted-foreground"}`}>
                          {r.verdict ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.coverage_state ?? "—"}</td>
                        <td className={`py-2 pr-3 ${r.robots_txt_state === "ALLOWED" ? "text-emerald-400" : "text-[var(--down)]"}`}>
                          {r.robots_txt_state ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.amp_verdict ?? "—"}</td>
                        <td className="py-2 text-amber-400">
                          {(r.issues ?? []).length === 0 ? <span className="text-emerald-400">OK</span> : (
                            <ul className="space-y-0.5">
                              {(r.issues ?? []).map((i: string, idx: number) => <li key={idx}>• {i}</li>)}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Lịch sử run */}
          <Card className="mt-6">
            <h2 className="mb-3 font-display text-sm uppercase tracking-[0.2em] text-foreground">Lịch sử ({(data.runs ?? []).length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-2 pr-3">Thời điểm</th><th className="py-2 pr-3">Trigger</th><th className="py-2 pr-3">Trạng thái</th><th className="py-2 pr-3">URL</th><th className="py-2">Có vấn đề</th></tr>
                </thead>
                <tbody>
                  {(data.runs ?? []).map((r: any) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 pr-3 text-foreground">{fmtDate(r.started_at)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.trigger}</td>
                      <td className={`py-2 pr-3 ${r.status === "ok" ? "text-emerald-400" : r.status === "failed" ? "text-[var(--down)]" : "text-amber-400"}`}>{r.status}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.total_urls}</td>
                      <td className={`py-2 ${r.urls_with_issues > 0 ? "text-amber-400" : "text-emerald-400"}`}>{r.urls_with_issues}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}