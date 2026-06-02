import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./middleware";
import { runFullAudit } from "@/lib/seo-audit.server";

export const getSeoAuditOverview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    // Lấy 2 lần audit gần nhất (cho phép diff)
    const { data: runs, error: runsErr } = await supabaseAdmin
      .from("seo_audit_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10);
    if (runsErr) throw new Error(runsErr.message);

    const latest = runs && runs.length > 0 ? runs[0] : null;
    const previous = runs && runs.length > 1 ? runs[1] : null;

    let latestResults: any[] = [];
    let previousResults: any[] = [];

    if (latest) {
      const { data, error } = await supabaseAdmin
        .from("seo_audit_url_results")
        .select("url, verdict, coverage_state, robots_txt_state, indexing_state, page_fetch_state, amp_verdict, rich_results_verdict, issues, last_crawl_time, google_canonical, user_canonical")
        .eq("run_id", latest.id)
        .order("url");
      if (error) throw new Error(error.message);
      latestResults = data ?? [];
    }
    if (previous) {
      const { data, error } = await supabaseAdmin
        .from("seo_audit_url_results")
        .select("url, issues")
        .eq("run_id", previous.id);
      if (error) throw new Error(error.message);
      previousResults = data ?? [];
    }

    // Diff: issues đã biến mất so với lần trước (cùng URL)
    const prevMap = new Map<string, Set<string>>();
    for (const r of previousResults) {
      prevMap.set(r.url, new Set(r.issues ?? []));
    }
    const disappeared: Array<{ url: string; issues: string[] }> = [];
    const newlyAppeared: Array<{ url: string; issues: string[] }> = [];
    for (const r of latestResults) {
      const prev = prevMap.get(r.url);
      const cur = new Set<string>(r.issues ?? []);
      if (prev) {
        const gone = Array.from(prev).filter((i) => !cur.has(i));
        if (gone.length > 0) disappeared.push({ url: r.url, issues: gone });
        const added = Array.from(cur).filter((i) => !prev.has(i));
        if (added.length > 0) newlyAppeared.push({ url: r.url, issues: added });
      } else if (cur.size > 0) {
        newlyAppeared.push({ url: r.url, issues: Array.from(cur) });
      }
    }

    return {
      runs: runs ?? [],
      latest,
      previous,
      latestResults,
      disappeared,
      newlyAppeared,
    };
  });

export const runSeoAuditNow = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const out = await runFullAudit("manual");
    return out;
  });