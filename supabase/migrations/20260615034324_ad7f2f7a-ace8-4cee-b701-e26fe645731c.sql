-- Seed draft & published rows from existing 'latest' (idempotent)
INSERT INTO public.savings_rates_snapshot (id, payload, source, fetched_at, updated_at)
SELECT 'published', payload, source, fetched_at, updated_at
FROM public.savings_rates_snapshot WHERE id = 'latest'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.savings_rates_snapshot (id, payload, source, fetched_at, updated_at)
SELECT 'draft', payload, source, fetched_at, updated_at
FROM public.savings_rates_snapshot WHERE id = 'latest'
ON CONFLICT (id) DO NOTHING;