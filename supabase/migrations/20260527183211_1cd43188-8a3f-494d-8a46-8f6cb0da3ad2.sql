
CREATE TYPE public.holding_asset_type AS ENUM ('crypto', 'gold');

CREATE TABLE public.portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_type public.holding_asset_type NOT NULL,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  avg_cost_usd NUMERIC,
  avg_cost_vnd NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_holdings_user ON public.portfolio_holdings(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_holdings TO authenticated;
GRANT ALL ON public.portfolio_holdings TO service_role;

ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own holdings" ON public.portfolio_holdings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own holdings" ON public.portfolio_holdings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own holdings" ON public.portfolio_holdings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own holdings" ON public.portfolio_holdings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER portfolio_holdings_updated_at
  BEFORE UPDATE ON public.portfolio_holdings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
