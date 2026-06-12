import { createFileRoute, redirect } from "@tanstack/react-router";

// /tai-san/ không có nội dung riêng — chuyển hướng về trang chủ để tránh
// 404 cho người dùng (và crawler) gõ thẳng URL gốc.
export const Route = createFileRoute("/tai-san/")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});