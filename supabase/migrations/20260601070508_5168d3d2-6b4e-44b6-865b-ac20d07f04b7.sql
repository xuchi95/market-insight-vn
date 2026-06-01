-- 1. Mở rộng watchlist_items
ALTER TABLE public.watchlist_items
  ADD COLUMN IF NOT EXISTS email_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_threshold_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_alert_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_alert_price_usd numeric;

-- 2. Kill-switch toàn cục trên profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS watchlist_alerts_global_enabled boolean NOT NULL DEFAULT true;

-- 3. Snapshot giá cho cron so sánh biến động
CREATE TABLE IF NOT EXISTS public.watchlist_price_snapshots (
  symbol text PRIMARY KEY,
  asset_type text NOT NULL,
  price_usd numeric NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.watchlist_price_snapshots TO authenticated;
GRANT ALL ON public.watchlist_price_snapshots TO service_role;

ALTER TABLE public.watchlist_price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage snapshots"
ON public.watchlist_price_snapshots
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Token huỷ cảnh báo (per-symbol hoặc toàn cục)
CREATE TABLE IF NOT EXISTS public.watchlist_alert_unsubscribe_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_watchlist_alert_unsub_user ON public.watchlist_alert_unsubscribe_tokens(user_id);

GRANT SELECT ON public.watchlist_alert_unsubscribe_tokens TO authenticated;
GRANT ALL ON public.watchlist_alert_unsubscribe_tokens TO service_role;

ALTER TABLE public.watchlist_alert_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own unsub tokens"
ON public.watchlist_alert_unsubscribe_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all unsub tokens"
ON public.watchlist_alert_unsubscribe_tokens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
