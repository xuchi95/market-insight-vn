import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/gold")({
  beforeLoad: () => {
    throw redirect({ to: "/gia-vang", statusCode: 301 });
  },
});
