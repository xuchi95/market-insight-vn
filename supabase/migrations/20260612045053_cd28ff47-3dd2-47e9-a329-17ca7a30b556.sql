CREATE TABLE public.ai_call_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  duration_ms INTEGER,
  metadata JSONB
);

CREATE INDEX ai_call_log_created_at_idx ON public.ai_call_log (created_at DESC);
CREATE INDEX ai_call_log_source_model_idx ON public.ai_call_log (source, model, created_at DESC);

GRANT ALL ON public.ai_call_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ai_call_log_id_seq TO service_role;

ALTER TABLE public.ai_call_log ENABLE ROW LEVEL SECURITY;

-- Admin reads through requireAdmin server fns + supabaseAdmin (service role bypasses RLS).
-- Add explicit admin policy so direct queries from authenticated admin clients also work.
CREATE POLICY "Admins can read ai_call_log"
  ON public.ai_call_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Daily prune: keep ~90 ngày, đủ để so sánh tuần này vs tuần trước.
-- Cron prune sẽ thêm sau ở supabase--insert.
