/**
 * MarketWatch SDK — client TypeScript cho REST + SSE realtime API.
 *
 * Hoạt động trên cả browser (EventSource) và Node 18+/Bun/Deno (fetch streaming).
 *
 * @example
 * ```ts
 * import { createMarketWatchClient } from "@marketwatch/sdk";
 *
 * const mw = createMarketWatchClient({ apiKey: "mw_live_xxx" });
 *
 * // 1) Lấy snapshot 1 lần
 * const snap = await mw.getSnapshot({ scopes: ["gold", "crypto"] });
 * console.log(snap.data.gold);
 *
 * // 2) Stream realtime
 * const stop = mw.stream({
 *   scopes: ["gold", "crypto", "fuel", "stocks"],
 *   interval: 10,
 *   onSnapshot: (s) => console.log(s.data.gold),
 *   onError: (e) => console.error(e),
 * });
 * // Khi không dùng nữa:
 * stop();
 * ```
 */

// ---------- Public types ----------

export type Scope = "gold" | "crypto" | "fuel" | "stocks";

export interface GoldItem {
  id: string;
  brand: string;
  type: string;
  buy: number;
  sell: number;
  mid?: number;
  unit: string;
  changePct: number;
  updatedAt: number;
}

export interface CryptoItem {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceVnd?: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  [k: string]: unknown;
}

export interface FuelItem {
  product: string;
  region: string;
  price: number;
  unit: string;
  effectiveAt?: number;
  [k: string]: unknown;
}

export interface StockIndexItem {
  code: string;
  name: string;
  value: number;
  change: number;
  changePct: number;
  [k: string]: unknown;
}

export interface ScopePayloads {
  gold: { items: GoldItem[] } & Record<string, unknown>;
  crypto: { coins: CryptoItem[] } & Record<string, unknown>;
  fuel: { items: FuelItem[] } & Record<string, unknown>;
  stocks: { items: StockIndexItem[] } & Record<string, unknown>;
}

export interface Snapshot<S extends Scope = Scope> {
  generatedAt: number;
  scopes: S[];
  data: { [K in S]?: ScopePayloads[K] };
}

export interface ClientOptions {
  apiKey: string;
  /** URL gốc — mặc định: https://marketwatch.vn */
  baseUrl?: string;
  /** Custom fetch (vd: cho Node < 18 hoặc test). */
  fetch?: typeof fetch;
}

export interface StreamOptions<S extends Scope = Scope> {
  scopes?: readonly S[];
  /** Tần suất push (giây, 5–60). Mặc định 10. */
  interval?: number;
  onSnapshot: (snapshot: Snapshot<S>) => void;
  onError?: (err: Error) => void;
  onOpen?: (hello: { scopes: S[]; interval: number; key: { id: string; name: string } }) => void;
  onClose?: (reason?: string) => void;
  /** Tự reconnect khi mất kết nối hoặc server đóng. Mặc định `true`. */
  reconnect?: boolean;
  /** Delay reconnect (ms). Mặc định 2000. */
  reconnectDelayMs?: number;
}

export interface SnapshotOptions<S extends Scope = Scope> {
  scopes?: readonly S[];
  signal?: AbortSignal;
}

const DEFAULT_BASE = "https://marketwatch.vn";

// ---------- Client ----------

export interface MarketWatchClient {
  getSnapshot<S extends Scope = Scope>(opts?: SnapshotOptions<S>): Promise<Snapshot<S>>;
  /** Mở SSE stream. Trả về hàm dừng (unsubscribe). */
  stream<S extends Scope = Scope>(opts: StreamOptions<S>): () => void;
}

export function createMarketWatchClient(options: ClientOptions): MarketWatchClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, "");
  const apiKey = options.apiKey;
  const fetchImpl = options.fetch ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined);
  if (!apiKey) throw new Error("[marketwatch-sdk] apiKey is required");

  async function getSnapshot<S extends Scope = Scope>(
    opts: SnapshotOptions<S> = {},
  ): Promise<Snapshot<S>> {
    if (!fetchImpl) throw new Error("[marketwatch-sdk] no global fetch — pass options.fetch");
    const url = new URL(`${baseUrl}/api/public/v1/snapshot`);
    if (opts.scopes?.length) url.searchParams.set("scopes", opts.scopes.join(","));
    const res = await fetchImpl(url.toString(), {
      headers: { accept: "application/json", "x-api-key": apiKey },
      signal: opts.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[marketwatch-sdk] snapshot ${res.status}: ${body}`);
    }
    const json = (await res.json()) as { generatedAt: number; scopes: S[]; data: Snapshot<S>["data"] };
    return { generatedAt: json.generatedAt, scopes: json.scopes, data: json.data };
  }

  function stream<S extends Scope = Scope>(opts: StreamOptions<S>): () => void {
    const url = new URL(`${baseUrl}/api/public/v1/stream`);
    url.searchParams.set("api_key", apiKey);
    if (opts.scopes?.length) url.searchParams.set("scopes", opts.scopes.join(","));
    if (opts.interval) url.searchParams.set("interval", String(opts.interval));

    const reconnect = opts.reconnect ?? true;
    const delay = opts.reconnectDelayMs ?? 2000;

    let stopped = false;
    let cleanup: (() => void) | null = null;

    const connect = () => {
      if (stopped) return;
      cleanup = openSseConnection<S>(url.toString(), {
        onSnapshot: opts.onSnapshot,
        onError: (e) => {
          opts.onError?.(e);
          if (!stopped && reconnect) setTimeout(connect, delay);
        },
        onOpen: opts.onOpen,
        onClose: (reason) => {
          opts.onClose?.(reason);
          if (!stopped && reconnect) setTimeout(connect, delay);
        },
        fetchImpl,
      });
    };
    connect();

    return () => {
      stopped = true;
      cleanup?.();
    };
  }

  return { getSnapshot, stream };
}

// ---------- SSE transport ----------

interface SseHandlers<S extends Scope> {
  onSnapshot: (snapshot: Snapshot<S>) => void;
  onError: (err: Error) => void;
  onOpen?: (hello: { scopes: S[]; interval: number; key: { id: string; name: string } }) => void;
  onClose?: (reason?: string) => void;
  fetchImpl: typeof fetch | undefined;
}

function openSseConnection<S extends Scope>(url: string, h: SseHandlers<S>): () => void {
  // Ưu tiên EventSource (browser) — nhẹ, có auto-reconnect.
  if (typeof EventSource !== "undefined") {
    const es = new EventSource(url);
    es.addEventListener("hello", (ev) => {
      try {
        h.onOpen?.(JSON.parse((ev as MessageEvent).data));
      } catch { /* ignore */ }
    });
    es.addEventListener("snapshot", (ev) => {
      try {
        h.onSnapshot(JSON.parse((ev as MessageEvent).data) as Snapshot<S>);
      } catch (e) {
        h.onError(e as Error);
      }
    });
    es.addEventListener("close", (ev) => {
      let reason: string | undefined;
      try { reason = JSON.parse((ev as MessageEvent).data).reason; } catch { /* ignore */ }
      es.close();
      h.onClose?.(reason);
    });
    es.onerror = () => {
      es.close();
      h.onError(new Error("EventSource connection error"));
    };
    return () => es.close();
  }

  // Fallback Node/Bun/Deno: dùng fetch streaming + parser SSE thủ công.
  if (!h.fetchImpl) {
    h.onError(new Error("[marketwatch-sdk] no EventSource and no fetch available"));
    return () => undefined;
  }
  const ctrl = new AbortController();
  void (async () => {
    try {
      const res = await h.fetchImpl!(url, {
        headers: { accept: "text/event-stream" },
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`SSE upstream ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          h.onClose?.();
          return;
        }
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          dispatchSseChunk<S>(chunk, h);
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      h.onError(e as Error);
    }
  })();
  return () => ctrl.abort();
}

function dispatchSseChunk<S extends Scope>(chunk: string, h: SseHandlers<S>): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return;
  const raw = dataLines.join("\n");
  try {
    const data = JSON.parse(raw);
    if (event === "snapshot") h.onSnapshot(data as Snapshot<S>);
    else if (event === "hello") h.onOpen?.(data);
    else if (event === "close") h.onClose?.(data?.reason);
    else if (event === "error") h.onError(new Error(data?.message ?? "stream error"));
  } catch (e) {
    h.onError(e as Error);
  }
}