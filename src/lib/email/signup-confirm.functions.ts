import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendSignupConfirmationFor } from "./signup-confirm.server";

/**
 * Only allow confirmation links to redirect back to our own origins.
 * Prevents this unauthenticated endpoint from being used as an open
 * redirect / phishing kick-off via crafted `redirectTo` values.
 */
const ALLOWED_REDIRECT_ORIGINS = new Set<string>([
  "https://marketwatch.vn",
  "https://www.marketwatch.vn",
  "https://market-insight-vn.lovable.app",
]);

function isAllowedRedirect(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (ALLOWED_REDIRECT_ORIGINS.has(u.origin)) return true;
    // Allow Lovable preview subdomains for this project.
    if (u.origin.endsWith(".lovable.app") && u.hostname.includes("52e41981-97fc-41b5-ab3a-9e7715246666")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

const Schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  fullName: z.string().max(120).nullable().optional(),
  redirectTo: z
    .string()
    .url()
    .max(500)
    .refine(isAllowedRedirect, { message: "redirectTo origin not allowed" }),
});

export const signupAndSendConfirmation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    await sendSignupConfirmationFor(
      data.email.trim().toLowerCase(),
      data.fullName?.trim() || null,
      data.password,
      data.redirectTo,
    );
    return { ok: true };
  });