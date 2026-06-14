/**
 * Shared authentication helper for cron-triggered public endpoints.
 *
 * Accepts EITHER:
 *   - `Authorization: Bearer <CRON_SECRET>`   — dedicated rotateable secret
 *   - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` — server-only key
 *     already stored in the database vault and used by pg_cron.
 *
 * Returns `null` when the request is authorized, otherwise an HTTP 401
 * `Response` ready to be returned by the route handler.
 *
 * NEVER accept the publishable / anon key here — it is shipped to the
 * browser bundle and would let any visitor trigger the endpoint.
 */
export function requireCronAuth(request: Request): Response | null {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  const cronSecret = process.env.CRON_SECRET ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (token && ((cronSecret && token === cronSecret) || (serviceKey && token === serviceKey))) {
    return null;
  }
  return new Response("Unauthorized", { status: 401 });
}