-- Drop all authenticated-facing RLS policies on user_mfa and user_mfa_methods.
-- All access now goes through server functions using service_role (which bypasses RLS).
-- This prevents totp_secret and backup_codes from ever being readable over the wire by clients.

DROP POLICY IF EXISTS "Users view own mfa" ON public.user_mfa;
DROP POLICY IF EXISTS "Users insert own mfa" ON public.user_mfa;
DROP POLICY IF EXISTS "Users update own mfa" ON public.user_mfa;
DROP POLICY IF EXISTS "Users delete own mfa" ON public.user_mfa;

DROP POLICY IF EXISTS "Users view own mfa methods" ON public.user_mfa_methods;
DROP POLICY IF EXISTS "Users insert own mfa methods" ON public.user_mfa_methods;
DROP POLICY IF EXISTS "Users update own mfa methods" ON public.user_mfa_methods;
DROP POLICY IF EXISTS "Users delete own mfa methods" ON public.user_mfa_methods;

-- Revoke direct table privileges from authenticated/anon as a second layer of defense.
-- service_role retains full access (bypasses RLS and uses its own grants).
REVOKE ALL ON public.user_mfa FROM authenticated, anon;
REVOKE ALL ON public.user_mfa_methods FROM authenticated, anon;

GRANT ALL ON public.user_mfa TO service_role;
GRANT ALL ON public.user_mfa_methods TO service_role;

-- RLS stays enabled — default-deny for everyone except service_role.
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_methods ENABLE ROW LEVEL SECURITY;