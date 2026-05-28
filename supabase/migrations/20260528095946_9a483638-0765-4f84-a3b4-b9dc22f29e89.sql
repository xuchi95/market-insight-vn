
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT ARRAY['gold','btc','usd']::text[],
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_unsubscribe_token_key
  ON public.newsletter_subscribers (unsubscribe_token);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
  ON public.newsletter_subscribers (email);

-- Allow users to look up their subscription by unsubscribe token (used by public unsubscribe page).
-- We don't grant SELECT broadly; queries go through the service role from server routes.
