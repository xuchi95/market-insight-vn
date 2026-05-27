import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/converter")({
  beforeLoad: () => {
    throw redirect({ to: "/quy-doi-tien-te", statusCode: 301 });
  },
});
