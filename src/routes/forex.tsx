import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/forex")({
  beforeLoad: () => {
    throw redirect({ to: "/ty-gia-ngoai-te", statusCode: 301 });
  },
});
