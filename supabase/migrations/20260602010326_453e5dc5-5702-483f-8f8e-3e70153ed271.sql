CREATE TABLE public.seo_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  trigger text NOT NULL DEFAULT 'cron',
  total_urls integer NOT NULL DEFAULT 0,
  urls_with_issues integer NOT NULL DEFAULT 0,
  sitemap_status jsonb,
  search_perf jsonb,
  error_message text
);

CREATE TABLE public.seo_audit_url_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.seo_audit_runs(id) ON DELETE CASCADE,
  url text NOT NULL,
  verdict text,
  coverage_state text,
  robots_txt_state text,
  indexing_state text,
  page_fetch_state text,
  google_canonical text,
  user_canonical text,
  last_crawl_time timestamptz,
  amp_verdict text,
  rich_results_verdict text,
  mobile_verdict text,
  issues text[] NOT NULL DEFAULT '{}',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seo_audit_runs_started_idx ON public.seo_audit_runs(started_at DESC);
CREATE INDEX seo_audit_url_results_run_idx ON public.seo_audit_url_results(run_id);
CREATE INDEX seo_audit_url_results_url_idx ON public.seo_audit_url_results(url);

GRANT SELECT ON public.seo_audit_runs TO authenticated;
GRANT ALL ON public.seo_audit_runs TO service_role;
GRANT SELECT ON public.seo_audit_url_results TO authenticated;
GRANT ALL ON public.seo_audit_url_results TO service_role;

ALTER TABLE public.seo_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_url_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit runs" ON public.seo_audit_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read audit results" ON public.seo_audit_url_results
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));