ALTER TABLE public.adblock_settings
  ADD COLUMN IF NOT EXISTS density text NOT NULL DEFAULT 'comfortable'
    CHECK (density IN ('compact', 'comfortable', 'spacious')),
  ADD COLUMN IF NOT EXISTS font_scale_desktop numeric(3,2) NOT NULL DEFAULT 1.00
    CHECK (font_scale_desktop >= 0.75 AND font_scale_desktop <= 1.50),
  ADD COLUMN IF NOT EXISTS font_scale_mobile numeric(3,2) NOT NULL DEFAULT 0.95
    CHECK (font_scale_mobile >= 0.75 AND font_scale_mobile <= 1.50);