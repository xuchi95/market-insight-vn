
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'newsletter-weekly-digest';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'newsletter-weekly-digest',
  '0 1 * * 1',
  $cron$
  SELECT net.http_post(
    url := 'https://project--52e41981-97fc-41b5-ab3a-9e7715246666.lovable.app/api/public/newsletter-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_Eq38MIC47Ss1O2mmTyf1dA_fIIRJAes'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
