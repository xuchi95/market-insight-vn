import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE_URL = "https://marketwatch.vn/";
const SITE_URL_ENCODED = encodeURIComponent(SITE_URL);
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const MAX_URLS_PER_RUN = 60;
const CONCURRENCY = 5;

function gatewayHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!gscKey) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY is not configured (kết nối Google Search Console chưa được liên kết)");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gscKey,
    "Content-Type": "application/json",
  };
}

export interface SitemapStatus {
  path: string;
  lastSubmitted: string | null;
  lastDownloaded: string | null;
  isPending: boolean;
  errors: number;
  warnings: number;
  contents: Array<{ type: string; submitted: number; indexed: number }>;
}

export interface SearchPerf {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  rangeDays: number;
}

export interface UrlInspectionResult {
  url: string;
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawlTime: string | null;
  ampVerdict: string | null;
  richResultsVerdict: string | null;
  mobileVerdict: string | null;
  issues: string[];
  raw: unknown;
}

/** Lấy danh sách URL từ sitemap.xml prod. */
export async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch(`${SITE_URL}sitemap.xml`, {
    headers: { accept: "application/xml" },
  });
  if (!res.ok) throw new Error(`Không tải được sitemap.xml: ${res.status}`);
  const xml = await res.text();
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
  // dedup + cap
  const unique = Array.from(new Set(locs));
  return unique.slice(0, MAX_URLS_PER_RUN);
}

/** GSC Sitemaps API. */
export async function fetchSitemapStatus(): Promise<SitemapStatus[]> {
  const res = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${SITE_URL_ENCODED}/sitemaps`,
    { headers: gatewayHeaders() },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GSC sitemaps API ${res.status}: ${body.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const list: any[] = Array.isArray(json?.sitemap) ? json.sitemap : [];
  return list.map((s) => ({
    path: String(s.path ?? ""),
    lastSubmitted: s.lastSubmitted ?? null,
    lastDownloaded: s.lastDownloaded ?? null,
    isPending: !!s.isPending,
    errors: Number(s.errors ?? 0),
    warnings: Number(s.warnings ?? 0),
    contents: Array.isArray(s.contents)
      ? s.contents.map((c: any) => ({
          type: String(c.type ?? ""),
          submitted: Number(c.submitted ?? 0),
          indexed: Number(c.indexed ?? 0),
        }))
      : [],
  }));
}

/** GSC Search Analytics: 28 ngày gần nhất. */
export async function fetchSearchPerf(): Promise<SearchPerf> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);
  const body = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    dimensions: [],
    rowLimit: 1,
  };
  const res = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${SITE_URL_ENCODED}/searchAnalytics/query`,
    { method: "POST", headers: gatewayHeaders(), body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GSC searchAnalytics ${res.status}: ${t.slice(0, 200)}`);
  }
  const j: any = await res.json();
  const row = Array.isArray(j?.rows) && j.rows.length > 0 ? j.rows[0] : null;
  return {
    clicks: Number(row?.clicks ?? 0),
    impressions: Number(row?.impressions ?? 0),
    ctr: Number(row?.ctr ?? 0),
    position: Number(row?.position ?? 0),
    rangeDays: 28,
  };
}

/** Gọi URL Inspection cho 1 URL. */
async function inspectUrl(url: string): Promise<UrlInspectionResult> {
  const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`urlInspection ${res.status}: ${t.slice(0, 200)}`);
  }
  const j: any = await res.json();
  const r = j?.inspectionResult ?? {};
  const idx = r.indexStatusResult ?? {};
  const amp = r.ampResult ?? null;
  const rich = r.richResultsResult ?? null;
  const mob = r.mobileUsabilityResult ?? null;

  const issues: string[] = [];
  if (idx.verdict && idx.verdict !== "PASS" && idx.verdict !== "NEUTRAL") {
    issues.push(`Index: ${idx.coverageState ?? idx.verdict}`);
  }
  if (idx.robotsTxtState && idx.robotsTxtState !== "ALLOWED") {
    issues.push(`Robots: ${idx.robotsTxtState}`);
  }
  if (idx.indexingState && idx.indexingState !== "INDEXING_ALLOWED") {
    issues.push(`Indexing: ${idx.indexingState}`);
  }
  if (idx.pageFetchState && idx.pageFetchState !== "SUCCESSFUL") {
    issues.push(`Fetch: ${idx.pageFetchState}`);
  }
  if (idx.googleCanonical && idx.userCanonical && idx.googleCanonical !== idx.userCanonical) {
    issues.push(`Canonical mismatch: Google chọn ${idx.googleCanonical}`);
  }
  if (amp?.verdict && amp.verdict !== "PASS" && amp.verdict !== "NEUTRAL") {
    issues.push(`AMP: ${amp.verdict}`);
  }
  if (Array.isArray(amp?.issues)) {
    for (const it of amp.issues) {
      if (it?.issueMessage) issues.push(`AMP issue: ${it.issueMessage}`);
    }
  }
  if (rich?.verdict && rich.verdict === "FAIL") {
    issues.push("Rich results: FAIL");
  }
  if (mob?.verdict && mob.verdict === "FAIL") {
    issues.push("Mobile usability: FAIL");
  }

  return {
    url,
    verdict: idx.verdict ?? null,
    coverageState: idx.coverageState ?? null,
    robotsTxtState: idx.robotsTxtState ?? null,
    indexingState: idx.indexingState ?? null,
    pageFetchState: idx.pageFetchState ?? null,
    googleCanonical: idx.googleCanonical ?? null,
    userCanonical: idx.userCanonical ?? null,
    lastCrawlTime: idx.lastCrawlTime ?? null,
    ampVerdict: amp?.verdict ?? null,
    richResultsVerdict: rich?.verdict ?? null,
    mobileVerdict: mob?.verdict ?? null,
    issues,
    raw: r,
  };
}

async function inspectInBatches(urls: string[]): Promise<UrlInspectionResult[]> {
  const out: UrlInspectionResult[] = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (u) => {
        try {
          return await inspectUrl(u);
        } catch (e) {
          return {
            url: u,
            verdict: null,
            coverageState: null,
            robotsTxtState: null,
            indexingState: null,
            pageFetchState: null,
            googleCanonical: null,
            userCanonical: null,
            lastCrawlTime: null,
            ampVerdict: null,
            richResultsVerdict: null,
            mobileVerdict: null,
            issues: [`Lỗi gọi GSC: ${(e as Error).message}`],
            raw: null,
          } satisfies UrlInspectionResult;
        }
      }),
    );
    out.push(...results);
  }
  return out;
}

/** Chạy 1 lần audit đầy đủ, lưu vào DB. */
export async function runFullAudit(trigger: "cron" | "manual"): Promise<{ runId: string; total: number; withIssues: number }> {
  const { data: runRow, error: insErr } = await supabaseAdmin
    .from("seo_audit_runs")
    .insert({ status: "running", trigger })
    .select("id")
    .single();
  if (insErr || !runRow) throw new Error("Không tạo được audit run: " + (insErr?.message ?? ""));
  const runId = runRow.id as string;

  try {
    const [urls, sitemapStatus, searchPerf] = await Promise.all([
      fetchSitemapUrls(),
      fetchSitemapStatus().catch((e) => ({ _error: (e as Error).message })),
      fetchSearchPerf().catch((e) => ({ _error: (e as Error).message })),
    ]);

    const results = await inspectInBatches(urls);
    const withIssues = results.filter((r) => r.issues.length > 0).length;

    if (results.length > 0) {
      const rows = results.map((r) => ({
        run_id: runId,
        url: r.url,
        verdict: r.verdict,
        coverage_state: r.coverageState,
        robots_txt_state: r.robotsTxtState,
        indexing_state: r.indexingState,
        page_fetch_state: r.pageFetchState,
        google_canonical: r.googleCanonical,
        user_canonical: r.userCanonical,
        last_crawl_time: r.lastCrawlTime,
        amp_verdict: r.ampVerdict,
        rich_results_verdict: r.richResultsVerdict,
        mobile_verdict: r.mobileVerdict,
        issues: r.issues,
        raw: r.raw as never,
      }));
      const { error: bulkErr } = await supabaseAdmin.from("seo_audit_url_results").insert(rows);
      if (bulkErr) throw new Error("Không lưu được kết quả: " + bulkErr.message);
    }

    await supabaseAdmin
      .from("seo_audit_runs")
      .update({
        status: "ok",
        finished_at: new Date().toISOString(),
        total_urls: results.length,
        urls_with_issues: withIssues,
        sitemap_status: sitemapStatus as never,
        search_perf: searchPerf as never,
      })
      .eq("id", runId);

    return { runId, total: results.length, withIssues };
  } catch (e) {
    await supabaseAdmin
      .from("seo_audit_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: (e as Error).message,
      })
      .eq("id", runId);
    throw e;
  }
}