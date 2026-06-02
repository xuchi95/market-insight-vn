CREATE TABLE public.vn_fuel_prices_snapshot (
  id text PRIMARY KEY DEFAULT 'latest',
  effective_from text NOT NULL,
  source_url text NOT NULL DEFAULT 'https://www.petrolimex.com.vn/nd/gia-xang-dau/gia-xang-dau-vung-1.html',
  rows jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.vn_fuel_prices_snapshot TO anon, authenticated;
GRANT ALL ON public.vn_fuel_prices_snapshot TO service_role;

ALTER TABLE public.vn_fuel_prices_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read fuel snapshot"
  ON public.vn_fuel_prices_snapshot FOR SELECT
  USING (true);

CREATE POLICY "Admins manage fuel snapshot"
  ON public.vn_fuel_prices_snapshot FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial snapshot from current static data
INSERT INTO public.vn_fuel_prices_snapshot (id, effective_from, rows)
VALUES (
  'latest',
  '15:00 — 28/05/2026',
  '[
    {"name":"Xăng RON 95-V","unit":"đồng/lít","zone1":25050,"zone2":25550,"highlight":true},
    {"name":"Xăng RON 95-III","unit":"đồng/lít","zone1":24150,"zone2":24630,"highlight":true},
    {"name":"Xăng E10 RON 95-V","unit":"đồng/lít","zone1":24560,"zone2":25050},
    {"name":"Xăng E10 RON 95-III","unit":"đồng/lít","zone1":23660,"zone2":24130},
    {"name":"Xăng E5 RON 92-II","unit":"đồng/lít","zone1":23250,"zone2":23710,"highlight":true},
    {"name":"Điêzen 0,001S-V","unit":"đồng/lít","zone1":28910,"zone2":29480},
    {"name":"Điêzen 0,05S-II","unit":"đồng/lít","zone1":27650,"zone2":28200,"highlight":true},
    {"name":"Dầu hỏa 2-K","unit":"đồng/lít","zone1":25800,"zone2":26310},
    {"name":"Mazút N°2B (3,5S)","unit":"đồng/kg","zone1":20440,"zone2":20840},
    {"name":"Mazút 180cst - 0,5S (RMG)","unit":"đồng/kg","zone1":23540,"zone2":24010}
  ]'::jsonb
);