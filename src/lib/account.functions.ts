import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại").max(200),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới tối thiểu 8 ký tự")
      .max(200, "Mật khẩu quá dài"),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });

export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ChangePasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Lấy email của user
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user?.email) {
      throw new Error("Không tìm thấy email của tài khoản.");
    }
    const email = userRes.user.email;

    // Xác thực mật khẩu hiện tại bằng cách thử đăng nhập với 1 client tạm
    const url = process.env.SUPABASE_URL!;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
    if (!url || !anon) throw new Error("Supabase chưa được cấu hình đầy đủ.");
    const tmp = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInErr } = await tmp.auth.signInWithPassword({
      email,
      password: data.currentPassword,
    });
    if (signInErr) {
      throw new Error("Mật khẩu hiện tại không đúng.");
    }
    // Đăng xuất phiên tạm để không giữ token
    await tmp.auth.signOut().catch(() => {});

    // Cập nhật mật khẩu mới qua admin API
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.newPassword,
    });
    if (updErr) {
      throw new Error(updErr.message || "Không đổi được mật khẩu.");
    }

    return { ok: true };
  });