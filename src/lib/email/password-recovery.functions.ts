import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendRecoveryEmailFor } from "./password-recovery.server";

/** Public: user-initiated forgot password. Always returns ok to avoid email enumeration. */
export const requestPasswordRecovery = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(254),
        redirectTo: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await sendRecoveryEmailFor(data.email, data.redirectTo);
    } catch (err) {
      console.error("[password-recovery] failed:", err);
    }
    return { ok: true };
  });