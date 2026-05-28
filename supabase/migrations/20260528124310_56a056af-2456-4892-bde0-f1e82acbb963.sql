CREATE TABLE public.user_mfa (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  authsignal_user_id TEXT NOT NULL,
  authenticator_id TEXT,
  enrolled BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMPTZ,
  backup_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mfa TO authenticated;
GRANT ALL ON public.user_mfa TO service_role;

ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mfa"
ON public.user_mfa FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mfa"
ON public.user_mfa FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own mfa"
ON public.user_mfa FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own mfa"
ON public.user_mfa FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER user_mfa_set_updated_at
BEFORE UPDATE ON public.user_mfa
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();