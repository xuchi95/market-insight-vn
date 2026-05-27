import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stocks")({
  beforeLoad: () => {
    throw redirect({ to: "/chung-khoan", statusCode: 301 });
  },
});
