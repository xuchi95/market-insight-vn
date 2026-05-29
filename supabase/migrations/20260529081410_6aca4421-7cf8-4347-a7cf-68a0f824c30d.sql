-- Bảng quản lý nhiều phương thức MFA cho 1 user
CREATE TABLE public.user_mfa_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('totp','sms','email_otp','magic_link','passkey')),
  authsignal_user_id TEXT NOT NULL,
  authenticator_id TEXT,
  label TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  enrolled BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, authenticator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mfa_methods TO authenticated;
GRANT ALL ON public.user_mfa_methods TO service_role;

ALTER TABLE public.user_mfa_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mfa methods" ON public.user_mfa_methods
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mfa methods" ON public.user_mfa_methods
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mfa methods" ON public.user_mfa_methods
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mfa methods" ON public.user_mfa_methods
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_mfa_methods_user ON public.user_mfa_methods (user_id);

CREATE TRIGGER set_user_mfa_methods_updated_at
  BEFORE UPDATE ON public.user_mfa_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Di chuyển dữ liệu TOTP đang có từ user_mfa sang user_mfa_methods
INSERT INTO public.user_mfa_methods (user_id, type, authsignal_user_id, authenticator_id, label, is_default, enrolled, enrolled_at, created_at)
SELECT user_id, 'totp', authsignal_user_id, authenticator_id, 'Authenticator app', true, enrolled, enrolled_at, created_at
FROM public.user_mfa
WHERE authenticator_id IS NOT NULL
ON CONFLICT (user_id, type, authenticator_id) DO NOTHING;

-- user_mfa giờ chỉ giữ backup_codes (giữ nguyên schema cho tương thích)
COMMENT ON TABLE public.user_mfa IS 'Legacy table — chỉ còn dùng cột backup_codes. Authenticator info đã chuyển sang user_mfa_methods.';