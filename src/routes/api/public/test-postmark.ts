import { createFileRoute } from "@tanstack/react-router";
import { sendEmail } from "@/lib/email/resend.server";

export const Route = createFileRoute("/api/public/test-postmark")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const to = url.searchParams.get("to") ?? "contact@marketwatch.vn";
        const subject = url.searchParams.get("subject") ?? "Postmark test from MarketWatch";
        try {
          const result = await sendEmail({
            to,
            subject,
            html: `<p>This is a Postmark configuration test sent at ${new Date().toISOString()}.</p>`,
          });
          return Response.json({ ok: true, to, result });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return Response.json({ ok: false, to, error: message }, { status: 500 });
        }
      },
    },
  },
});