DO $$ BEGIN
  CREATE TYPE public.transaction_side AS ENUM ('buy', 'sell');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.portfolio_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_type public.holding_asset_type NOT NULL,
  symbol text NOT NULL,
  side public.transaction_side NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  price_vnd numeric,
  price_usd numeric,
  fee_vnd numeric NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_tx_user ON public.portfolio_transactions(user_id, executed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_transactions TO authenticated;
GRANT ALL ON public.portfolio_transactions TO service_role;

ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.portfolio_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own transactions"
  ON public.portfolio_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own transactions"
  ON public.portfolio_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own transactions"
  ON public.portfolio_transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);