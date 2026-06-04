CREATE TYPE public.code_injection_location AS ENUM ('head', 'body_start', 'body_end');

CREATE TABLE public.site_code_injections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location public.code_injection_location NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_code_injections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_code_injections TO authenticated;
GRANT ALL ON public.site_code_injections TO service_role;

ALTER TABLE public.site_code_injections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled injections"
  ON public.site_code_injections FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can read all injections"
  ON public.site_code_injections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert injections"
  ON public.site_code_injections FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update injections"
  ON public.site_code_injections FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete injections"
  ON public.site_code_injections FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_code_injections_set_updated_at
  BEFORE UPDATE ON public.site_code_injections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX site_code_injections_location_idx
  ON public.site_code_injections (location, priority);