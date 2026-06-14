
CREATE TABLE public.adblock_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'soft' CHECK (mode IN ('soft','hard','dismiss')),
  layout TEXT NOT NULL DEFAULT 'modal' CHECK (layout IN ('modal','banner_top','banner_bottom','fullscreen','corner')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','gold','custom')),
  title TEXT NOT NULL DEFAULT 'Có vẻ bạn đang dùng trình chặn quảng cáo',
  message TEXT NOT NULL DEFAULT 'MarketWatch là dự án miễn phí — quảng cáo giúp chúng tôi duy trì dữ liệu realtime. Vui lòng tắt trình chặn quảng cáo cho marketwatch.vn để tiếp tục.',
  secondary_message TEXT NOT NULL DEFAULT 'Cảm ơn bạn đã ủng hộ ❤️',
  button_text TEXT NOT NULL DEFAULT 'Tôi đã tắt — Tiếp tục',
  dismiss_text TEXT NOT NULL DEFAULT 'Bỏ qua lần này',
  allow_dismiss BOOLEAN NOT NULL DEFAULT true,
  show_retry BOOLEAN NOT NULL DEFAULT true,
  show_logo BOOLEAN NOT NULL DEFAULT true,
  bg_color TEXT NOT NULL DEFAULT '#1a1a1a',
  text_color TEXT NOT NULL DEFAULT '#f5f0df',
  accent_color TEXT NOT NULL DEFAULT '#c9a84c',
  overlay_color TEXT NOT NULL DEFAULT '#000000',
  overlay_opacity NUMERIC(3,2) NOT NULL DEFAULT 0.80 CHECK (overlay_opacity BETWEEN 0 AND 1),
  backdrop_blur INT NOT NULL DEFAULT 8 CHECK (backdrop_blur BETWEEN 0 AND 40),
  border_radius INT NOT NULL DEFAULT 16 CHECK (border_radius BETWEEN 0 AND 48),
  detection_bait BOOLEAN NOT NULL DEFAULT true,
  detection_fetch BOOLEAN NOT NULL DEFAULT true,
  detection_script BOOLEAN NOT NULL DEFAULT true,
  recheck_interval_sec INT NOT NULL DEFAULT 0 CHECK (recheck_interval_sec BETWEEN 0 AND 3600),
  dismiss_cooldown_hours INT NOT NULL DEFAULT 24 CHECK (dismiss_cooldown_hours BETWEEN 0 AND 720),
  whitelist_paths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  whitelist_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.adblock_settings TO anon, authenticated;
GRANT ALL ON public.adblock_settings TO service_role;

ALTER TABLE public.adblock_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adblock_settings public read" ON public.adblock_settings
  FOR SELECT USING (true);

CREATE POLICY "adblock_settings admin write" ON public.adblock_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER adblock_settings_updated_at
  BEFORE UPDATE ON public.adblock_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.adblock_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
