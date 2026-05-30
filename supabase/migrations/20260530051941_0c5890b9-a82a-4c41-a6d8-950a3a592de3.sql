CREATE TABLE public.watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  to_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist_items TO authenticated;
GRANT ALL ON public.watchlist_items TO service_role;

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own watchlist"
ON public.watchlist_items FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own watchlist"
ON public.watchlist_items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own watchlist"
ON public.watchlist_items FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own watchlist"
ON public.watchlist_items FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_watchlist_items_user ON public.watchlist_items(user_id);