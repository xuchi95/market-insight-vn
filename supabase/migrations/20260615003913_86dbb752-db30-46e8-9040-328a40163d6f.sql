-- Returns one row per symbol — the price sample whose captured_at is closest to `target`,
-- limited to a ±tol_ms window and an optional minimum sample age.
CREATE OR REPLACE FUNCTION public.closest_price_samples(
  p_symbols text[],
  p_target timestamptz,
  p_tol_ms bigint,
  p_min_age_ms bigint DEFAULT 0
)
RETURNS TABLE(symbol text, price numeric, captured_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (ph.symbol)
    ph.symbol, ph.price, ph.captured_at
  FROM public.price_history ph
  WHERE ph.symbol = ANY(p_symbols)
    AND ph.captured_at >= p_target - make_interval(secs => p_tol_ms / 1000.0)
    AND ph.captured_at <= p_target + make_interval(secs => p_tol_ms / 1000.0)
    AND (p_min_age_ms <= 0 OR ph.captured_at <= now() - make_interval(secs => p_min_age_ms / 1000.0))
  ORDER BY ph.symbol, abs(extract(epoch FROM (ph.captured_at - p_target)));
$$;

GRANT EXECUTE ON FUNCTION public.closest_price_samples(text[], timestamptz, bigint, bigint) TO authenticated, service_role;

-- Supporting partial index: most lookups care about recent rows only.
-- The existing (symbol, captured_at DESC) index already supports the WHERE
-- predicate; add a covering INCLUDE so PostgREST/RPC reads can come straight
-- from the index without touching the heap for the price column.
CREATE INDEX IF NOT EXISTS price_history_symbol_time_price_idx
  ON public.price_history (symbol, captured_at DESC) INCLUDE (price);