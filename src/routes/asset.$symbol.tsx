import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/asset/$symbol")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/tai-san/$symbol", params, statusCode: 301 });
  },
});
