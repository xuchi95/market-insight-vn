
CREATE TABLE public.gold_price_overrides (
  gold_id text NOT NULL PRIMARY KEY,
  brand text NOT NULL,
  type text NOT NULL,
  buy bigint NOT NULL,
  sell bigint NOT NULL,
  unit text NOT NULL DEFAULT 'VND/chỉ',
  note text,
  effective_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gold_price_overrides_prices_positive CHECK (buy > 0 AND sell > 0)
);

GRANT SELECT ON public.gold_price_overrides TO anon;
GRANT SELECT ON public.gold_price_overrides TO authenticated;
GRANT ALL ON public.gold_price_overrides TO service_role;

ALTER TABLE public.gold_price_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active gold overrides"
  ON public.gold_price_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage gold overrides"
  ON public.gold_price_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at_gold_overrides()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER gold_price_overrides_updated_at
  BEFORE UPDATE ON public.gold_price_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_gold_overrides();
