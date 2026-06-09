import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, Radio, Zap, KeyRound, Package, BookOpen } from "lucide-react";

const API_TITLE = "API & SDK realtime cho nhà phát triển — MarketWatch";
const API_DESC = "Tích hợp giá vàng, tiền điện tử, xăng dầu và chứng khoán Việt Nam vào website của bạn qua REST, SSE realtime và SDK TypeScript chính thức.";
const API_URL = "https://marketwatch.vn/api-cho-nha-phat-trien";

export const Route = createFileRoute("/api-cho-nha-phat-trien")({
  head: () => ({
    meta: [
      { title: API_TITLE },
      { name: "description", content: API_DESC },
      { name: "keywords", content: "api giá vàng, api crypto, api tỷ giá, api chứng khoán, sse realtime, sdk typescript, marketwatch api, dữ liệu tài chính việt nam" },
      { property: "og:title", content: API_TITLE },
      { property: "og:description", content: API_DESC },
      { name: "twitter:title", content: API_TITLE },
      { name: "twitter:description", content: API_DESC },
      { property: "og:url", content: API_URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "vi_VN" },
    ],
    links: [
      { rel: "canonical", href: "https://marketwatch.vn/api-cho-nha-phat-trien" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://marketwatch.vn/" },
            { "@type": "ListItem", position: 2, name: "API cho nhà phát triển", item: "https://marketwatch.vn/api-cho-nha-phat-trien" },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "API & SDK realtime cho nhà phát triển — MarketWatch",
          description:
            "Tài liệu tích hợp REST snapshot, SSE realtime và SDK @marketwatch/sdk cho dữ liệu giá vàng, crypto, xăng dầu và chứng khoán Việt Nam.",
          inLanguage: "vi-VN",
          url: "https://marketwatch.vn/api-cho-nha-phat-trien",
          author: { "@type": "Organization", name: "MarketWatch", url: "https://marketwatch.vn" },
          publisher: { "@type": "Organization", name: "MarketWatch", url: "https://marketwatch.vn" },
          proficiencyLevel: "Beginner",
        }),
      },
    ],
  }),
  component: DeveloperApiPage,
});

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-background/60 p-4 text-xs leading-relaxed text-foreground/90">
      <code>{children}</code>
    </pre>
  );
}

function DeveloperApiPage() {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://marketwatch.vn";

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
        Dành cho nhà phát triển
      </div>
      <h1 className="mt-2 font-display text-3xl md:text-4xl text-foreground">
        API &amp; SDK realtime MarketWatch
      </h1>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: Zap, title: "REST snapshot", desc: "1 lần gọi, lấy toàn bộ giá hiện tại theo scope." },
          { icon: Radio, title: "SSE realtime", desc: "Stream push tự động mỗi 5–60 giây, không cần polling." },
          { icon: Package, title: "SDK TypeScript", desc: "@marketwatch/sdk — ESM/CJS/IIFE, hỗ trợ Vite & Webpack." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-5">
            <f.icon className="h-5 w-5 text-[var(--gold)]" />
            <div className="mt-2 font-medium text-foreground">{f.title}</div>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[var(--gold)]" />
          <h2 className="font-display text-2xl text-foreground">1. Xin API key</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Mỗi key được cấp với danh sách <em>scope</em> (gold, crypto, fuel, stocks) và
          không giới hạn thời gian. Liên hệ để nhận key dùng thử miễn phí cho dự án
          của bạn.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/yeu-cau-api-key"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--gold)] px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Yêu cầu API key →
          </Link>
          <a
            href="mailto:contact@marketwatch.vn?subject=Yêu%20cầu%20API%20key%20MarketWatch"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            contact@marketwatch.vn
          </a>
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[var(--gold)]" />
          <h2 className="font-display text-2xl text-foreground">2. Endpoints</h2>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-sm font-medium text-foreground">REST — Snapshot</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Lấy dữ liệu hiện tại một lần. Lọc nhóm bằng <code>?scopes=gold,crypto</code>.
          </p>
          <div className="mt-3">
            <CodeBlock>{`curl -H "x-api-key: YOUR_KEY" \\
  "${origin}/api/public/v1/snapshot?scopes=gold,crypto,fuel,stocks"`}</CodeBlock>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-sm font-medium text-foreground">Realtime stream (SSE)</div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            MarketWatch dùng <strong className="text-foreground">Server-Sent Events</strong> (HTTP/1.1 streaming)
            thay cho WebSocket — nhẹ hơn, đi qua mọi proxy/CDN và dùng được trực tiếp
            với <code>EventSource</code> trên trình duyệt mà không cần thư viện. Server
            tự reconnect, tự đóng sau ~30 phút để client mở lại.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">Endpoint</div>
              <CodeBlock>{`GET ${origin}/api/public/v1/stream`}</CodeBlock>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">Content-Type</div>
              <CodeBlock>{`text/event-stream; charset=utf-8`}</CodeBlock>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
              Query parameters (request)
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tham số</th>
                    <th className="px-3 py-2 font-medium">Bắt buộc</th>
                    <th className="px-3 py-2 font-medium">Mặc định</th>
                    <th className="px-3 py-2 font-medium">Mô tả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="px-3 py-2 font-mono text-foreground">api_key</td>
                    <td className="px-3 py-2">có</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">
                      Khoá API. EventSource không cho custom header → truyền qua query.
                      Server đồng thời chấp nhận header <code>x-api-key</code> hoặc
                      <code> Authorization: Bearer</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-foreground">scopes</td>
                    <td className="px-3 py-2">không</td>
                    <td className="px-3 py-2">tất cả</td>
                    <td className="px-3 py-2">
                      CSV của <code>gold,crypto,fuel,stocks</code>. Bị giới hạn theo
                      quyền của key.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-foreground">interval</td>
                    <td className="px-3 py-2">không</td>
                    <td className="px-3 py-2">10</td>
                    <td className="px-3 py-2">Chu kỳ push (giây), khoảng <code>5–60</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
              Event map (server → client)
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Event</th>
                    <th className="px-3 py-2 font-medium">Khi nào</th>
                    <th className="px-3 py-2 font-medium">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="px-3 py-2 font-mono text-[var(--gold)]">hello</td>
                    <td className="px-3 py-2">Ngay khi kết nối</td>
                    <td className="px-3 py-2"><code>{`{ ok, interval, scopes, key: { id, name } }`}</code></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-[var(--gold)]">snapshot</td>
                    <td className="px-3 py-2">Mỗi <code>interval</code> giây</td>
                    <td className="px-3 py-2"><code>{`{ generatedAt, scopes, data: { gold?, crypto?, fuel?, stocks? } }`}</code></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-[var(--gold)]">error</td>
                    <td className="px-3 py-2">Lỗi upstream khi lấy 1 scope</td>
                    <td className="px-3 py-2"><code>{`{ message: string }`}</code></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-[var(--gold)]">close</td>
                    <td className="px-3 py-2">Trước khi server đóng (sau ~30 phút)</td>
                    <td className="px-3 py-2"><code>{`{ reason: "max_duration" }`}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
              Format raw trên dây (SSE wire)
            </div>
            <CodeBlock>{`event: hello
data: {"ok":true,"interval":10,"scopes":["gold","crypto"],"key":{"id":"…","name":"site abc.vn"}}

event: snapshot
data: {"generatedAt":1733400000000,"scopes":["gold","crypto"],"data":{"gold":{…},"crypto":[…]}}

event: close
data: {"reason":"max_duration"}`}</CodeBlock>
          </div>

          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
              Ví dụ kết nối từ trình duyệt
            </div>
            <CodeBlock>{`const url = new URL("${origin}/api/public/v1/stream");
url.searchParams.set("api_key", "YOUR_KEY");
url.searchParams.set("scopes", "gold,crypto");
url.searchParams.set("interval", "10");

const ev = new EventSource(url.toString());

ev.addEventListener("hello", (e) => {
  console.log("connected", JSON.parse(e.data));
});

ev.addEventListener("snapshot", (e) => {
  const { generatedAt, data } = JSON.parse(e.data);
  console.log(new Date(generatedAt), data.gold, data.crypto);
});

ev.addEventListener("error", (e) => {
  // Lỗi nghiệp vụ từ server (1 scope upstream fail)
  try { console.warn("scope error:", JSON.parse((e as MessageEvent).data)); } catch {}
});

ev.addEventListener("close", (e) => {
  console.log("server closing:", JSON.parse(e.data));
  ev.close(); // trình duyệt sẽ KHÔNG tự reconnect khi bạn close() chủ động
});

// Khi rời trang
window.addEventListener("beforeunload", () => ev.close());`}</CodeBlock>
          </div>

          <div className="mt-5 rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Lưu ý:</strong> kết nối auto-close sau
            ~30 phút (event <code>close</code> với <code>reason: "max_duration"</code>) —
            <code>EventSource</code> mặc định sẽ tự reconnect sau vài giây nếu bạn không
            gọi <code>ev.close()</code>. Với Node.js dùng package
            <code> eventsource </code> hoặc gói <code>@marketwatch/sdk</code> bên dưới.
          </div>
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[var(--gold)]" />
          <h2 className="font-display text-2xl text-foreground">3. SDK chính thức</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <code>@marketwatch/sdk</code> đóng gói sẵn auth, parsing và stream — hỗ trợ
          Node, Vite, Webpack và bản IIFE chạy thẳng trên browser.
        </p>
        <CodeBlock>{`npm install @marketwatch/sdk

import { createClient } from "@marketwatch/sdk";

const mw = createClient({ apiKey: "YOUR_KEY" });

// Một lần
const snap = await mw.snapshot({ scopes: ["gold", "crypto"] });

// Realtime
const stop = mw.stream({ scopes: ["gold"], interval: 10 }, (e) => {
  console.log(e.data.gold);
});`}</CodeBlock>
        <CodeBlock>{`<!-- Hoặc dùng trực tiếp trên trình duyệt (IIFE bundle) -->
<script src="https://unpkg.com/@marketwatch/sdk"></script>
<script>
  const mw = MarketWatch.createClient({ apiKey: "YOUR_KEY" });
  mw.stream({ scopes: ["gold"] }, (e) => console.log(e.data));
</script>`}</CodeBlock>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://www.npmjs.com/package/@marketwatch/sdk"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <Package className="h-4 w-4" /> Xem trên npm
          </a>
          <a
            href={`${origin}/api/public/v1/snapshot`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <BookOpen className="h-4 w-4" /> Thử endpoint
          </a>
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-border bg-card p-5">
        <h3 className="font-medium text-foreground">Phạm vi dữ liệu (scopes)</h3>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <li><strong className="text-foreground">gold</strong> — SJC, PNJ, DOJI, XAU/USD</li>
          <li><strong className="text-foreground">crypto</strong> — BTC, ETH &amp; top 100 theo vốn hoá</li>
          <li><strong className="text-foreground">fuel</strong> — Xăng RON95, E5, dầu DO/KO Việt Nam</li>
          <li><strong className="text-foreground">stocks</strong> — VN-Index, HOSE, HNX, UPCOM</li>
        </ul>
      </section>
    </main>
  );
}