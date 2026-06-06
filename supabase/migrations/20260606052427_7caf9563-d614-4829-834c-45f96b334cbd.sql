
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.api_key_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  website TEXT,
  project_name TEXT NOT NULL,
  project_description TEXT NOT NULL,
  use_case TEXT NOT NULL,
  expected_monthly_requests TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  integration_type TEXT,
  agreed_terms BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT api_key_requests_status_check CHECK (status IN ('pending','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_key_requests TO authenticated;
GRANT ALL ON public.api_key_requests TO service_role;

ALTER TABLE public.api_key_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all api_key_requests"
  ON public.api_key_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update api_key_requests"
  ON public.api_key_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete api_key_requests"
  ON public.api_key_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX api_key_requests_status_idx ON public.api_key_requests(status, created_at DESC);
CREATE INDEX api_key_requests_email_idx ON public.api_key_requests(email);

CREATE TRIGGER update_api_key_requests_updated_at
  BEFORE UPDATE ON public.api_key_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
