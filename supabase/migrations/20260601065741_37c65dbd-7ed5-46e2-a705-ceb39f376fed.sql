-- Admin popups
CREATE TABLE public.admin_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  title text NOT NULL,
  subtitle text,
  body_md text,
  cta_label text NOT NULL DEFAULT 'Đăng ký',
  success_message text NOT NULL DEFAULT 'Cảm ơn bạn đã đăng ký!',
  theme jsonb NOT NULL DEFAULT '{"accent":"gold","layout":"center","animation":"fade"}'::jsonb,
  fields jsonb NOT NULL DEFAULT '[{"name":"email","label":"Email","type":"email","required":true,"placeholder":"ban@vidu.com"}]'::jsonb,
  targeting jsonb NOT NULL DEFAULT '{"pages":["*"],"delaySeconds":25,"scrollPercent":0,"frequencyDays":1,"hideForSubscribers":true}'::jsonb,
  topics text[] NOT NULL DEFAULT ARRAY['gold','btc','usd'],
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_popups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_popups TO authenticated;
GRANT ALL ON public.admin_popups TO service_role;

ALTER TABLE public.admin_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active popups" ON public.admin_popups
  FOR SELECT TO anon, authenticated
  USING (
    enabled = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Admins manage popups" ON public.admin_popups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_admin_popups_updated_at
  BEFORE UPDATE ON public.admin_popups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin broadcasts (email blasts)
CREATE TABLE public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_md text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('all_users','newsletter','admins','custom_emails')),
  custom_emails text[] NOT NULL DEFAULT '{}',
  topics_filter text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','sending','sent','failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_broadcasts TO authenticated;
GRANT ALL ON public.admin_broadcasts TO service_role;

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcasts" ON public.admin_broadcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_admin_broadcasts_updated_at
  BEFORE UPDATE ON public.admin_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin audit log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- contact_submissions: add read_at + admin access
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE POLICY "Admins read contact" ON public.contact_submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update contact" ON public.contact_submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete contact" ON public.contact_submissions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- newsletter_subscribers: admin access
CREATE POLICY "Admins read newsletter" ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update newsletter" ON public.newsletter_subscribers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete newsletter" ON public.newsletter_subscribers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles: admins can view + update all
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- email_send_log: admins can view (for dashboard)
CREATE POLICY "Admins read email log" ON public.email_send_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default newsletter popup using current hardcoded UI
INSERT INTO public.admin_popups (slug, title, subtitle, body_md, cta_label, success_message, topics, theme, targeting)
VALUES (
  'default-newsletter',
  'Thị trường mỗi sáng',
  'Vàng · Crypto · Ngoại tệ — gói gọn trong 1 email.',
  'Miễn phí · Huỷ bất cứ lúc nào.',
  'Đăng ký nhận bản tin',
  'Cảm ơn bạn đã đăng ký bản tin MarketWatch!',
  ARRAY['gold','btc','usd'],
  '{"accent":"gold","layout":"center","animation":"fade","icon":"mail"}'::jsonb,
  '{"pages":["*"],"delaySeconds":25,"scrollPercent":0,"frequencyDays":1,"hideForSubscribers":true,"authDelaySeconds":90,"authFrequencyDays":7}'::jsonb
);
