// Áp dụng security headers cho mọi response ở lớp Worker.
// Mục tiêu: giảm rủi ro XSS/clickjacking/MIME-sniff mà không phá vỡ:
//   • Iframe preview trong editor Lovable (id-preview--*.lovable.app)
//   • Google AdSense / DoubleClick
//   • TradingView widgets & charts
//   • Supabase Data API + Realtime (wss)
//   • Lovable AI Gateway / connector gateway
//   • Binance ticker (websocket)

const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-inline' + 'unsafe-eval' cần cho: script theme khởi động sớm ở
  // __root, AdSense, TradingView, GTM. Có thể siết bằng nonce sau này.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https:",
    "blob:",
  ],
  "script-src-elem": [
    "'self'",
    "'unsafe-inline'",
    "https:",
    "blob:",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https:"],
  "style-src-elem": ["'self'", "'unsafe-inline'", "https:"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:", "https:"],
  "connect-src": [
    "'self'",
    "https:",
    "wss:",
  ],
  "frame-src": [
    "'self'",
    "https:",
  ],
  "media-src": ["'self'", "https:", "data:", "blob:"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https:"],
  // Cho phép Lovable editor + preview iframe hiển thị site.
  "frame-ancestors": [
    "'self'",
    "https://*.lovable.app",
    "https://*.lovable.dev",
    "https://lovable.dev",
    "https://lovable.app",
  ],
  "upgrade-insecure-requests": [],
};

function buildCsp(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

const CSP_VALUE = buildCsp();

const STATIC_HEADERS: Array<[string, string]> = [
  ["Content-Security-Policy", CSP_VALUE],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self), fullscreen=(self)",
  ],
  ["Cross-Origin-Opener-Policy", "same-origin-allow-popups"],
];

// HSTS chỉ set trên HTTPS (không set trên localhost/dev qua http).
const HSTS_VALUE = "max-age=31536000; includeSubDomains; preload";

/**
 * Bọc response từ TanStack Start entry và gắn security headers.
 * Không đè lên header đã có sẵn để tránh phá vỡ endpoint đặc thù.
 */
export function applySecurityHeaders(request: Request, response: Response): Response {
  // Không đụng vào response WebSocket upgrade.
  if (response.status === 101) return response;

  const headers = new Headers(response.headers);

  for (const [name, value] of STATIC_HEADERS) {
    if (!headers.has(name)) headers.set(name, value);
  }

  try {
    const url = new URL(request.url);
    if (url.protocol === "https:" && !headers.has("Strict-Transport-Security")) {
      headers.set("Strict-Transport-Security", HSTS_VALUE);
    }
  } catch {
    /* ignore */
  }

  // Không set X-Frame-Options — dùng CSP frame-ancestors ở trên để đảm bảo
  // Lovable editor vẫn iframe được preview.

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}