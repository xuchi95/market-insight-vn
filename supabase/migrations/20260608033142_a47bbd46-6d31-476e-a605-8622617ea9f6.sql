
CREATE TABLE public.newsletter_topic_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  topics text[] NOT NULL CHECK (array_length(topics, 1) BETWEEN 1 AND 8),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_topic_presets TO authenticated;
GRANT ALL ON public.newsletter_topic_presets TO service_role;

ALTER TABLE public.newsletter_topic_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own presets"
  ON public.newsletter_topic_presets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- At most one default per user
CREATE UNIQUE INDEX newsletter_topic_presets_one_default_per_user
  ON public.newsletter_topic_presets (user_id)
  WHERE is_default = true;

CREATE INDEX newsletter_topic_presets_user_idx
  ON public.newsletter_topic_presets (user_id, created_at DESC);

CREATE TRIGGER newsletter_topic_presets_set_updated_at
  BEFORE UPDATE ON public.newsletter_topic_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
