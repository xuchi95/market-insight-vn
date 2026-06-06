import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendApiKeyRequestReceivedEmail } from "@/lib/email/api-key-request-emails.server";

const SCOPES = ["gold", "crypto", "fuel", "stocks"] as const;
const INTEGRATIONS = ["rest", "sse", "sdk", "other"] as const;
const VOLUMES = ["<1k", "1k-10k", "10k-100k", ">100k"] as const;

const Schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(255)
    .url("Website phải là URL hợp lệ (https://...)")
    .optional()
    .or(z.literal("")),
  project_name: z.string().trim().min(2).max(160),
  project_description: z.string().trim().min(20).max(1500),
  use_case: z.string().trim().min(20).max(1500),
  expected_monthly_requests: z.enum(VOLUMES).optional(),
  scopes: z.array(z.enum(SCOPES)).min(1).max(SCOPES.length),
  integration_type: z.enum(INTEGRATIONS).optional(),
  agreed_terms: z.literal(true, {
    errorMap: () => ({ message: "Bạn cần đồng ý điều khoản sử dụng API." }),
  }),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/api-key-request")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Yêu cầu không hợp lệ" },
            { status: 400, headers: CORS },
          );
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Dữ liệu chưa hợp lệ", issues: parsed.error.flatten() },
            { status: 400, headers: CORS },
          );
        }
        const data = parsed.data;

        // Chống spam thô: chặn cùng email gửi >3 yêu cầu pending.
        const { count: pendingCount } = await supabaseAdmin
          .from("api_key_requests")
          .select("id", { count: "exact", head: true })
          .eq("email", data.email.toLowerCase())
          .eq("status", "pending");
        if ((pendingCount ?? 0) >= 3) {
          return Response.json(
            { error: "Bạn đã có nhiều yêu cầu đang chờ duyệt. Vui lòng đợi phản hồi." },
            { status: 429, headers: CORS },
          );
        }

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;
        const ua = request.headers.get("user-agent")?.slice(0, 500) ?? null;

        const { error } = await supabaseAdmin.from("api_key_requests").insert({
          full_name: data.full_name,
          email: data.email.toLowerCase(),
          company: data.company || null,
          website: data.website || null,
          project_name: data.project_name,
          project_description: data.project_description,
          use_case: data.use_case,
          expected_monthly_requests: data.expected_monthly_requests ?? null,
          scopes: data.scopes,
          integration_type: data.integration_type ?? null,
          agreed_terms: data.agreed_terms,
          ip_address: ip,
          user_agent: ua,
        });
        if (error) {
          return Response.json(
            { error: "Không lưu được yêu cầu, vui lòng thử lại." },
            { status: 500, headers: CORS },
          );
        }

        // Gửi email xác nhận — không chặn phản hồi nếu lỗi.
        try {
          await sendApiKeyRequestReceivedEmail({
            to: data.email,
            fullName: data.full_name,
            projectName: data.project_name,
            scopes: data.scopes,
          });
        } catch (e) {
          console.error("[api-key-request] send confirmation failed", e);
        }

        return Response.json({ ok: true }, { status: 200, headers: CORS });
      },
    },
  },
});