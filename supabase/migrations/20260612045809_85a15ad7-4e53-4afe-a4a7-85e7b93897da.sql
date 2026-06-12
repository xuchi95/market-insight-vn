ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS notify_gold boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_crypto boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_forex boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_morning boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_evening boolean NOT NULL DEFAULT true;