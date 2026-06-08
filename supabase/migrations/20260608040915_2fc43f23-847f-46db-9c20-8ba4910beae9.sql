DROP POLICY IF EXISTS "Public can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Public can subscribe"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (
  (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)
  AND (char_length(email) <= 254)
  AND (user_id IS NULL OR user_id = auth.uid())
);