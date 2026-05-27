import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  beforeLoad: () => {
    throw redirect({ to: "/dieu-khoan-su-dung", statusCode: 301 });
  },
});
