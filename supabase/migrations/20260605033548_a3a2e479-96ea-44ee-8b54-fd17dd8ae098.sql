
CREATE TABLE public.price_change_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  window_tolerance_hours NUMERIC(5,2) NOT NULL DEFAULT 2.0 CHECK (window_tolerance_hours >= 0 AND window_tolerance_hours <= 12),
  min_sample_age_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (min_sample_age_hours >= 0 AND min_sample_age_hours <= 24),
  min_samples INTEGER NOT NULL DEFAULT 1 CHECK (min_samples >= 1 AND min_samples <= 100),
  snapshot_min_interval_minutes INTEGER NOT NULL DEFAULT 5 CHECK (snapshot_min_interval_minutes >= 1 AND snapshot_min_interval_minutes <= 1440),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.price_change_settings TO authenticated;
GRANT ALL ON public.price_change_settings TO service_role;

ALTER TABLE public.price_change_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read price settings"
  ON public.price_change_settings FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.price_change_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TRIGGER price_change_settings_updated_at
  BEFORE UPDATE ON public.price_change_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
