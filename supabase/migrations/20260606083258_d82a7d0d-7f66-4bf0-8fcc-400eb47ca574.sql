CREATE TABLE IF NOT EXISTS public.app_news_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  cmc_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_news_settings_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.app_news_settings TO authenticated;
GRANT ALL ON public.app_news_settings TO service_role;
ALTER TABLE public.app_news_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read news settings" ON public.app_news_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert news settings" ON public.app_news_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update news settings" ON public.app_news_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.app_news_settings (id, cmc_enabled) VALUES (1, true) ON CONFLICT (id) DO NOTHING;