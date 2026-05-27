import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bank-rates")({
  beforeLoad: () => {
    throw redirect({ to: "/lai-suat-ngan-hang", statusCode: 301 });
  },
});
