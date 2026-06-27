
CREATE TABLE public.api_request_metrics (
  bucket_minute timestamptz NOT NULL,
  endpoint text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  total_duration_ms bigint NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_minute, endpoint)
);

CREATE INDEX api_request_metrics_bucket_idx ON public.api_request_metrics (bucket_minute DESC);

GRANT SELECT ON public.api_request_metrics TO authenticated;
GRANT ALL ON public.api_request_metrics TO service_role;

ALTER TABLE public.api_request_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api metrics"
  ON public.api_request_metrics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Atomic upsert that increments counters; called from server via supabaseAdmin.
CREATE OR REPLACE FUNCTION public.bump_api_metrics(
  p_bucket timestamptz,
  p_endpoint text,
  p_count integer,
  p_total_ms bigint,
  p_errors integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.api_request_metrics (bucket_minute, endpoint, count, total_duration_ms, errors)
  VALUES (p_bucket, p_endpoint, p_count, p_total_ms, p_errors)
  ON CONFLICT (bucket_minute, endpoint)
  DO UPDATE SET
    count = public.api_request_metrics.count + EXCLUDED.count,
    total_duration_ms = public.api_request_metrics.total_duration_ms + EXCLUDED.total_duration_ms,
    errors = public.api_request_metrics.errors + EXCLUDED.errors;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_api_metrics(timestamptz, text, integer, bigint, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.bump_api_metrics(timestamptz, text, integer, bigint, integer) TO service_role;
