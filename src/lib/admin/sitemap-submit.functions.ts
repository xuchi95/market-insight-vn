import { createServerFn } from "@tanstack/react-start";
import { requireAdmin, logAudit } from "./middleware.server";

const SITE_URL = "https://marketwatch.vn/";
const SITEMAP_URL = "https://marketwatch.vn/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

// Các header GSC/Google thường trả về và có giá trị debug
const INTERESTING_HEADERS = [
  "x-guploader-uploadid",
  "x-request-id",
  "x-goog-request-id",
  "alt-svc",
  "server",
  "content-type",
  "date",
];

function pickHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of INTERESTING_HEADERS) {
    const v = h.get(k);
    if (v) out[k] = v;
  }
  return out;
}

/**
 * Admin-triggered resubmit sitemap to Google Search Console.
 * Trả về chi tiết phản hồi (status, request id, headers, body, timing)
 * + snapshot trạng thái sitemap sau khi submit (lastSubmitted, errors, warnings).
 */
export const resubmitSitemapToGsc = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
    if (!lovableKey || !gscKey) {
      throw new Error("Thiếu LOVABLE_API_KEY hoặc GOOGLE_SEARCH_CONSOLE_API_KEY");
    }

    const siteEnc = encodeURIComponent(SITE_URL);
    const sitemapEnc = encodeURIComponent(SITEMAP_URL);
    const submitUrl = `${GATEWAY}/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}`;
    const getUrl = `${GATEWAY}/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}`;

    // 1) Gửi PUT để submit
    const submitStart = Date.now();
    const submitAt = new Date().toISOString();
    let submitRes: Response;
    try {
      submitRes = await fetch(submitUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gscKey,
        },
      });
    } catch (e) {
      throw new Error(`Không kết nối được GSC: ${(e as Error).message}`);
    }
    const submitDuration = Date.now() - submitStart;
    const submitBody = await submitRes.text();
    const submitHeaders = pickHeaders(submitRes.headers);
    const requestId =
      submitHeaders["x-guploader-uploadid"] ||
      submitHeaders["x-goog-request-id"] ||
      submitHeaders["x-request-id"] ||
      null;

    const result = {
      ok: submitRes.ok,
      submitted: SITEMAP_URL,
      site: SITE_URL,
      at: submitAt,
      durationMs: submitDuration,
      status: submitRes.status,
      statusText: submitRes.statusText,
      requestId,
      headers: submitHeaders,
      body: submitBody.slice(0, 1000) || null,
      // 2) GET trạng thái sitemap sau submit (để hiển thị errors/warnings)
      sitemap: null as null | {
        path?: string;
        lastSubmitted?: string;
        lastDownloaded?: string;
        isPending?: boolean;
        isSitemapsIndex?: boolean;
        type?: string;
        errors?: number;
        warnings?: number;
        contents?: string;
      },
      sitemapError: null as null | string,
    };

    if (!submitRes.ok) {
      await logAudit(context.userId, "gsc.sitemap_resubmit.fail", "sitemap", SITEMAP_URL, {
        status: submitRes.status,
        requestId,
      });
      throw Object.assign(
        new Error(`GSC trả về ${submitRes.status}: ${submitBody.slice(0, 300)}`),
        { detail: result },
      );
    }

    // 2) Đọc snapshot trạng thái sitemap (best-effort)
    try {
      const getRes = await fetch(getUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gscKey,
        },
      });
      if (getRes.ok) {
        const json = (await getRes.json()) as Record<string, unknown>;
        result.sitemap = {
          path: json.path as string | undefined,
          lastSubmitted: json.lastSubmitted as string | undefined,
          lastDownloaded: json.lastDownloaded as string | undefined,
          isPending: json.isPending as boolean | undefined,
          isSitemapsIndex: json.isSitemapsIndex as boolean | undefined,
          type: json.type as string | undefined,
          errors: Number(json.errors ?? 0),
          warnings: Number(json.warnings ?? 0),
          contents: json.contents ? JSON.stringify(json.contents).slice(0, 1000) : undefined,
        };
      } else {
        result.sitemapError = `GET ${getRes.status}: ${(await getRes.text()).slice(0, 200)}`;
      }
    } catch (e) {
      result.sitemapError = (e as Error).message;
    }

    await logAudit(context.userId, "gsc.sitemap_resubmit", "sitemap", SITEMAP_URL, {
      site: SITE_URL,
      status: submitRes.status,
      requestId,
      durationMs: submitDuration,
    });

    return result;
  });