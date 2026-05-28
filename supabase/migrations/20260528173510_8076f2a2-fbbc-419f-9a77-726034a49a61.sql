ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS newsletter_subscribers_user_id_idx
  ON public.newsletter_subscribers(user_id);

UPDATE public.newsletter_subscribers ns
SET user_id = p.id
FROM public.profiles p
WHERE ns.user_id IS NULL AND lower(p.email) = lower(ns.email);