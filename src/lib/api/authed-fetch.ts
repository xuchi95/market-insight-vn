import { supabase } from "@/integrations/supabase/client";

/**
 * Lỗi báo hiệu endpoint yêu cầu đăng nhập (HTTP 401 `auth_required`).
 * Các component bắt lỗi này để render "khoá thành viên".
 */
export class AuthRequiredError extends Error {
  readonly authRequired = true as const;
  constructor(message = "Yêu cầu đăng nhập") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function isAuthRequiredError(e: unknown): e is AuthRequiredError {
  return !!e && typeof e === "object" && (e as any).authRequired === true;
}

/**
 * fetch wrapper tự đính kèm Bearer token Supabase khi có session.
 * Nếu server trả 401 `auth_required` → throw `AuthRequiredError`.
 */
export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    /* no session */
  }
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    let msg = "Yêu cầu đăng nhập";
    try {
      const j = await res.clone().json();
      if (j?.message) msg = String(j.message);
    } catch {
      /* ignore */
    }
    throw new AuthRequiredError(msg);
  }
  return res;
}