import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";
import { signupConfirmEmail } from "./templates.server";

export async function sendSignupConfirmationFor(
  email: string,
  name: string | null,
  password: string,
  redirectTo: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo, data: name ? { full_name: name } : undefined },
  });
  if (error) throw new Error(error.message);
  const actionLink = (data as { properties?: { action_link?: string } } | null)
    ?.properties?.action_link;
  if (!actionLink) throw new Error("Không lấy được liên kết xác thực.");
  const { subject, html } = signupConfirmEmail({ name, actionLink });
  await sendEmail({ to: email, subject, html, tags: ["signup-confirm"] });
}