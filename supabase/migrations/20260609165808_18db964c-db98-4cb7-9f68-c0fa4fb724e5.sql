
CREATE TYPE public.ban_appeal_status AS ENUM ('pending', 'approved', 'rejected');

CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.ban_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  status public.ban_appeal_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ban_appeals_status_idx ON public.ban_appeals(status, created_at DESC);

GRANT ALL ON public.ban_appeals TO service_role;

ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read appeals" ON public.ban_appeals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update appeals" ON public.ban_appeals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ban_appeals_set_updated_at
  BEFORE UPDATE ON public.ban_appeals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
