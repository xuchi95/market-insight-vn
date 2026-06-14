ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS min_change_pct numeric(5,2) NOT NULL DEFAULT 0
  CHECK (min_change_pct >= 0 AND min_change_pct <= 50);