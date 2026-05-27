import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/disclaimer")({
  beforeLoad: () => {
    throw redirect({ to: "/mien-tru-trach-nhiem", statusCode: 301 });
  },
});
