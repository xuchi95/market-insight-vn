-- 1. Add issued_at column for TTL tracking
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token_issued_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows: assume tokens were issued at creation time
UPDATE public.newsletter_subscribers
SET unsubscribe_token_issued_at = created_at
WHERE unsubscribe_token_issued_at = now()::date::timestamptz
   OR unsubscribe_token_issued_at IS NULL;

-- 2. Rotation function: regenerates expired tokens for still-subscribed rows
CREATE OR REPLACE FUNCTION public.rotate_expired_unsubscribe_tokens(ttl_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rotated integer;
BEGIN
  WITH upd AS (
    UPDATE public.newsletter_subscribers
       SET unsubscribe_token = gen_random_uuid(),
           unsubscribe_token_issued_at = now()
     WHERE unsubscribed_at IS NULL
       AND unsubscribe_token_issued_at < (now() - make_interval(days => ttl_days))
     RETURNING 1
  )
  SELECT count(*) INTO rotated FROM upd;
  RETURN rotated;
END;
$$;

-- Lock down: only service_role may call it (cron + admin code paths)
REVOKE EXECUTE ON FUNCTION public.rotate_expired_unsubscribe_tokens(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rotate_expired_unsubscribe_tokens(integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rotate_expired_unsubscribe_tokens(integer) TO service_role;

-- 3. Schedule daily rotation via pg_cron (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rotate-expired-unsubscribe-tokens') THEN
    PERFORM cron.unschedule('rotate-expired-unsubscribe-tokens');
  END IF;
  PERFORM cron.schedule(
    'rotate-expired-unsubscribe-tokens',
    '0 3 * * *',
    $cron$ SELECT public.rotate_expired_unsubscribe_tokens(180); $cron$
  );
END;
$$;