CREATE TABLE public.user_cookie_consent (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  prefs JSONB NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_cookie_consent TO authenticated;
GRANT ALL ON public.user_cookie_consent TO service_role;

ALTER TABLE public.user_cookie_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consent" ON public.user_cookie_consent
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own consent" ON public.user_cookie_consent
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own consent" ON public.user_cookie_consent
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own consent" ON public.user_cookie_consent
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_cookie_consent_updated_at
  BEFORE UPDATE ON public.user_cookie_consent
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();