import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";
import { passwordResetEmail } from "./templates.server";

export async function sendRecoveryEmailFor(email: string, redirectTo: string): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  const actionLink = (data as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (!actionLink) throw new Error("Không lấy được liên kết khôi phục.");
  const { subject, html } = passwordResetEmail({ actionLink });
  await sendEmail({
    to: email,
    subject,
    html,
    tags: ["password-recovery"],
  });
}