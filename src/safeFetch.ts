import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isBlockedHostname, isBlockedIp } from "./urlSafety.js";

const MAX_REDIRECTS = 5;

export type AddressLookup = (hostname: string) => Promise<string[]>;

export class SafeFetchError extends Error {
  readonly publicMessage: string;

  constructor(detail: string, publicMessage: string) {
    super(detail);
    this.name = "SafeFetchError";
    this.publicMessage = publicMessage;
  }
}

export interface SafeFetchOptions {
  timeoutMs: number;
  maxBytes: number;
  userAgent: string;
  /** error: 上限超過で失敗。truncate: 先頭だけ読んで返す（HTML の og:image 走査用）。 */
  onOverflow: "error" | "truncate";
  lookup?: AddressLookup;
  fetchImpl?: typeof fetch;
}

async function defaultLookup(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function hostnameOf(url: URL): string {
  const host = url.hostname;
  if (host.startsWith("[") && host.endsWith("]")) return host.slice(1, -1);
  return host;
}

/**
 * 取得してよい https URL であることを確かめる。
 * リダイレクトのたびに呼ぶ。DNS の結果に非公開アドレスが混ざっていれば拒否する。
 */
export async function assertPublicHttpsUrl(
  rawUrl: string,
  resolve: AddressLookup,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError(`invalid URL: ${rawUrl}`, "URLが許可されていません");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new SafeFetchError(`scheme or credentials not allowed: ${url.protocol}`, "URLが許可されていません");
  }
  if (url.port !== "" && url.port !== "443") {
    throw new SafeFetchError(`port ${url.port} is not allowed`, "URLが許可されていません");
  }
  const host = hostnameOf(url);
  if (isBlockedHostname(host)) {
    throw new SafeFetchError(`blocked host ${host}`, "URLが許可されていません");
  }
  if (isIP(host) !== 0) return url;

  let addresses: string[];
  try {
    addresses = await resolve(host);
  } catch (error) {
    const message = error instanceof Error ? error.message : "dns failed";
    throw new SafeFetchError(`dns failed for ${host}: ${message}`, "取得できませんでした");
  }
  if (addresses.length === 0 || addresses.some((address) => isBlockedIp(address))) {
    throw new SafeFetchError(
      `blocked address for ${host}: ${addresses.join(",") || "(none)"}`,
      "URLが許可されていません",
    );
  }
  return url;
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // 既に閉じている、または中断済み
  }
}

async function readBody(
  response: Response,
  maxBytes: number,
  onOverflow: "error" | "truncate",
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (total + value.byteLength > maxBytes) {
        const room = maxBytes - total;
        if (onOverflow === "truncate") {
          if (room > 0) chunks.push(value.subarray(0, room));
          await cancelReader(reader);
          break;
        }
        await cancelReader(reader);
        throw new SafeFetchError(`response exceeds ${maxBytes} bytes`, "応答が大きすぎます");
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } catch (error) {
    await cancelReader(reader);
    throw error;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

/**
 * https の公開ホストだけを、リダイレクトごとに再検証しながら取得する。
 * 応答サイズを上限で打ち切り、圧縮展開後のバイト数で数える。
 */
export async function safeFetchText(rawUrl: string, options: SafeFetchOptions): Promise<string> {
  const resolve = options.lookup ?? defaultLookup;
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = AbortSignal.timeout(options.timeoutMs);
  let current = rawUrl;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const url = await assertPublicHttpsUrl(current, resolve);
      const response = await fetchImpl(url, {
        redirect: "manual",
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        headers: { "user-agent": options.userAgent },
      });

      if (isRedirect(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (hop === MAX_REDIRECTS || !location) {
          throw new SafeFetchError(`too many redirects from ${url.href}`, "リダイレクトが多すぎます");
        }
        current = new URL(location, url).href;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new SafeFetchError(`HTTP ${response.status} ${response.statusText}`, `HTTP ${response.status}`);
      }
      return await readBody(response, options.maxBytes, options.onOverflow);
    }
  } catch (error) {
    if (error instanceof SafeFetchError) throw error;
    if (isTimeout(error)) throw new SafeFetchError("timeout", "タイムアウト");
    const message = error instanceof Error ? error.message : "fetch failed";
    throw new SafeFetchError(message, "取得できませんでした");
  }
  throw new SafeFetchError(`too many redirects from ${rawUrl}`, "リダイレクトが多すぎます");
}
