
CREATE OR REPLACE FUNCTION public.admin_cron_job_summary()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  runs_24h bigint,
  failures_24h bigint,
  runs_1h bigint,
  failures_1h bigint,
  last_start timestamptz,
  last_status text,
  last_message text,
  avg_duration_ms numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  WITH d AS (
    SELECT jobid,
           start_time,
           end_time,
           status,
           return_message,
           EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 AS dur_ms
    FROM cron.job_run_details
    WHERE start_time > now() - INTERVAL '24 hours'
  ),
  last_row AS (
    SELECT DISTINCT ON (jobid)
      jobid, start_time, status, return_message
    FROM cron.job_run_details
    WHERE start_time > now() - INTERVAL '7 days'
    ORDER BY jobid, start_time DESC
  )
  SELECT
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.active,
    COALESCE((SELECT count(*) FROM d WHERE d.jobid = j.jobid), 0) AS runs_24h,
    COALESCE((SELECT count(*) FROM d WHERE d.jobid = j.jobid AND d.status = 'failed'), 0) AS failures_24h,
    COALESCE((SELECT count(*) FROM d WHERE d.jobid = j.jobid AND d.start_time > now() - INTERVAL '1 hour'), 0) AS runs_1h,
    COALESCE((SELECT count(*) FROM d WHERE d.jobid = j.jobid AND d.status = 'failed' AND d.start_time > now() - INTERVAL '1 hour'), 0) AS failures_1h,
    lr.start_time AS last_start,
    lr.status::text AS last_status,
    lr.return_message AS last_message,
    COALESCE((SELECT avg(dur_ms) FROM d WHERE d.jobid = j.jobid), 0)::numeric AS avg_duration_ms
  FROM cron.job j
  LEFT JOIN last_row lr ON lr.jobid = j.jobid
  ORDER BY runs_24h DESC, j.jobname;
$$;

CREATE OR REPLACE FUNCTION public.admin_cron_minute_timeline(p_minutes integer DEFAULT 60)
RETURNS TABLE (
  bucket timestamptz,
  jobname text,
  runs bigint,
  failures bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT
    date_trunc('minute', d.start_time) AS bucket,
    j.jobname::text AS jobname,
    count(*)::bigint AS runs,
    count(*) FILTER (WHERE d.status = 'failed')::bigint AS failures
  FROM cron.job_run_details d
  JOIN cron.job j USING (jobid)
  WHERE d.start_time > now() - make_interval(mins => GREATEST(LEAST(p_minutes, 1440), 1))
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2;
$$;

REVOKE ALL ON FUNCTION public.admin_cron_job_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cron_job_summary() TO service_role;

REVOKE ALL ON FUNCTION public.admin_cron_minute_timeline(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cron_minute_timeline(integer) TO service_role;
