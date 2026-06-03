CREATE TABLE IF NOT EXISTS public.price_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.price_cache TO anon, authenticated;
GRANT ALL ON public.price_cache TO service_role;

ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read price cache"
  ON public.price_cache
  FOR SELECT
  USING (true);