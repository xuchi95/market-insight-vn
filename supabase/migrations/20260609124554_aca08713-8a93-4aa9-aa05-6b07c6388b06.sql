SELECT cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue'), schedule := '30 seconds');
SELECT cron.unschedule('watchlist-alerts-every-20m');
SELECT cron.unschedule('price-alerts-check');
SELECT cron.schedule('price-alerts-check', '*/15 * * * *', $$SELECT net.http_post(url := 'https://project--52e41981-97fc-41b5-ab3a-9e7715246666.lovable.app/api/public/price-alerts-cron', headers := jsonb_build_object('Content-Type','application/json','apikey','sb_publishable_Eq38MIC47Ss1O2mmTyf1dA_fIIRJAes'), body := '{}'::jsonb) AS request_id;$$);