import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireStepUp } from "@/lib/mfa.functions";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại").max(200),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới tối thiểu 8 ký tự")
      .max(200, "Mật khẩu quá dài"),
    stepUpToken: z.string().optional(),
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

    // Step-up MFA — enforced when the user has any enrolled method.
    await requireStepUp(userId, data.stepUpToken);

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

const RequestEmailChangeSchema = z.object({
  newEmail: z.string().trim().email("Email không hợp lệ").max(254),
  stepUpToken: z.string().optional(),
});

/**
 * Bắt đầu đổi email tài khoản. Supabase sẽ gửi email xác nhận tới địa chỉ
 * mới (và cả địa chỉ cũ nếu cấu hình bật "Secure email change"). Yêu cầu
 * step-up MFA nếu người dùng đã bật ≥1 phương thức bảo mật.
 */
export const requestEmailChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RequestEmailChangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    await requireStepUp(userId, data.stepUpToken);

    const newEmail = data.newEmail.toLowerCase();

    // Cấm đổi sang email đang dùng
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userRes?.user?.email?.toLowerCase() === newEmail) {
      throw new Error("Email mới trùng với email hiện tại.");
    }

    // Dùng client của user (đã có session) để Supabase gửi email xác nhận
    // tới địa chỉ mới — KHÔNG dùng admin API để cập nhật trực tiếp (sẽ
    // bỏ qua bước xác nhận và mất an toàn).
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      throw new Error(error.message || "Không gửi được yêu cầu đổi email.");
    }
    return { ok: true, sentTo: newEmail };
  });