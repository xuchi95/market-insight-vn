import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendSignupConfirmationFor } from "./signup-confirm.server";

const Schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  fullName: z.string().max(120).nullable().optional(),
  redirectTo: z.string().url().max(500),
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