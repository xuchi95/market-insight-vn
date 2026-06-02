CREATE TABLE public.vn_fuel_prices_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from text NOT NULL,
  source_url text NOT NULL,
  rows jsonb NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_vn_fuel_prices_history_created_at
  ON public.vn_fuel_prices_history (created_at DESC);

GRANT SELECT, INSERT ON public.vn_fuel_prices_history TO authenticated;
GRANT ALL ON public.vn_fuel_prices_history TO service_role;

ALTER TABLE public.vn_fuel_prices_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read fuel history"
  ON public.vn_fuel_prices_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert fuel history"
  ON public.vn_fuel_prices_history FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed lịch sử với snapshot hiện tại để có baseline
INSERT INTO public.vn_fuel_prices_history (effective_from, source_url, rows, source, created_at)
SELECT effective_from, source_url, rows, 'seed', updated_at
FROM public.vn_fuel_prices_snapshot
WHERE id = 'latest';