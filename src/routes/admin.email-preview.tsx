import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/email-preview")({
  beforeLoad: () => {
    throw redirect({ to: "/mw-admin/email-preview", replace: true });
  },
});