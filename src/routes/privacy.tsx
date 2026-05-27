import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  beforeLoad: () => {
    throw redirect({ to: "/chinh-sach-bao-mat", statusCode: 301 });
  },
});
