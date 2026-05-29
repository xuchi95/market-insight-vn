ALTER TABLE public.user_mfa ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE public.user_mfa_methods ADD COLUMN IF NOT EXISTS totp_secret text;