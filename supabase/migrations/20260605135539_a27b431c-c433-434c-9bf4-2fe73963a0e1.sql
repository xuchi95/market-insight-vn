
CREATE TABLE public.app_ai_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  predict_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_ai_settings TO service_role;
ALTER TABLE public.app_ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages ai settings"
  ON public.app_ai_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
INSERT INTO public.app_ai_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
