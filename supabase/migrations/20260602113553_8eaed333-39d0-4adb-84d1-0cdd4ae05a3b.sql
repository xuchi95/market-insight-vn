ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_ip text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_alerts_enabled boolean NOT NULL DEFAULT true;