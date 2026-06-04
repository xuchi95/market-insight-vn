CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'watchlist-alerts-every-20m';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'watchlist-alerts-every-20m',
  '*/20 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--52e41981-97fc-41b5-ab3a-9e7715246666.lovable.app/api/public/watchlist-alerts-cron',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);