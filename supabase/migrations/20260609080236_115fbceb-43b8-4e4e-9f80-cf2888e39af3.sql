
CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  session_id TEXT,
  anon_id TEXT,
  user_id UUID,
  route TEXT,
  referrer_host TEXT,
  device TEXT,
  country TEXT,
  placement TEXT,
  ad_slot TEXT,
  format TEXT,
  target TEXT,
  value NUMERIC,
  meta JSONB
);

GRANT ALL ON public.analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin-only đọc qua server functions; không cấp quyền cho anon/authenticated.
CREATE POLICY "Admin can read analytics_events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX analytics_events_ts_idx ON public.analytics_events (ts DESC);
CREATE INDEX analytics_events_type_ts_idx ON public.analytics_events (event_type, ts DESC);
CREATE INDEX analytics_events_route_ts_idx ON public.analytics_events (route, ts DESC) WHERE route IS NOT NULL;
CREATE INDEX analytics_events_session_idx ON public.analytics_events (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX analytics_events_placement_ts_idx ON public.analytics_events (placement, ts DESC) WHERE placement IS NOT NULL;

-- Daily prune: giữ 90 ngày sự kiện thô.
SELECT cron.schedule(
  'analytics-events-prune',
  '0 3 * * *',
  $$DELETE FROM public.analytics_events WHERE ts < now() - INTERVAL '90 days';$$
);
