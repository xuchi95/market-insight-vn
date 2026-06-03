import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PrefsSchema = z.object({
  necessary: z.literal(true),
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
});

const SaveSchema = z.object({
  version: z.string().min(1).max(16),
  prefs: PrefsSchema,
  userAgent: z.string().max(512).optional(),
});

export const getMyCookieConsent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_cookie_consent")
      .select("version, prefs, accepted_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const saveMyCookieConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_cookie_consent")
      .upsert(
        {
          user_id: userId,
          version: data.version,
          prefs: data.prefs,
          accepted_at: new Date().toISOString(),
          user_agent: data.userAgent ?? null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });