CREATE TABLE IF NOT EXISTS public.savings_rates_snapshot (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  payload JSONB NOT NULL,
  source TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.savings_rates_snapshot TO anon;
GRANT SELECT ON public.savings_rates_snapshot TO authenticated;
GRANT ALL ON public.savings_rates_snapshot TO service_role;

ALTER TABLE public.savings_rates_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read savings snapshot"
  ON public.savings_rates_snapshot
  FOR SELECT
  USING (true);
