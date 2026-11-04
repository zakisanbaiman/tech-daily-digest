import { BlockList, isIP } from "node:net";

/**
 * サーバからの取得・ブラウザからの参照の両方で、ループバック / プライベート /
 * リンクローカル / クラウドメタデータ / トンネルアドレスを拒否する。
 * IPv4-mapped IPv6（::ffff:127.0.0.1 や ::ffff:7f00:1）は Node の BlockList が
 * 対応する IPv4 レンジとして判定する。
 */
const BLOCKED = new BlockList();

BLOCKED.addSubnet("0.0.0.0", 8, "ipv4");
BLOCKED.addSubnet("10.0.0.0", 8, "ipv4");
BLOCKED.addSubnet("100.64.0.0", 10, "ipv4");
BLOCKED.addSubnet("127.0.0.0", 8, "ipv4");
BLOCKED.addSubnet("169.254.0.0", 16, "ipv4");
BLOCKED.addSubnet("172.16.0.0", 12, "ipv4");
BLOCKED.addSubnet("192.0.0.0", 24, "ipv4");
BLOCKED.addSubnet("192.0.2.0", 24, "ipv4");
BLOCKED.addSubnet("192.168.0.0", 16, "ipv4");
BLOCKED.addSubnet("198.18.0.0", 15, "ipv4");
BLOCKED.addSubnet("198.51.100.0", 24, "ipv4");
BLOCKED.addSubnet("203.0.113.0", 24, "ipv4");
BLOCKED.addSubnet("224.0.0.0", 4, "ipv4");
BLOCKED.addSubnet("240.0.0.0", 4, "ipv4");

BLOCKED.addAddress("::", "ipv6");
BLOCKED.addAddress("::1", "ipv6");
BLOCKED.addSubnet("fc00::", 7, "ipv6");
BLOCKED.addSubnet("fe80::", 10, "ipv6");
BLOCKED.addSubnet("fec0::", 10, "ipv6");
BLOCKED.addSubnet("ff00::", 8, "ipv6");
BLOCKED.addSubnet("2001:db8::", 32, "ipv6");
BLOCKED.addSubnet("2001:0::", 32, "ipv6");
BLOCKED.addSubnet("2002::", 16, "ipv6");

const BLOCKED_HOST_NAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
]);

function stripHost(hostname: string): string {
  let host = hostname.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  return host.replace(/\.+$/, "");
}

/** IP リテラルが非公開アドレスなら true。解釈できない文字列も true（フェイルクローズ）。 */
export function isBlockedIp(raw: string): boolean {
  const ip = stripHost(raw);
  const family = isIP(ip);
  if (family === 4) return BLOCKED.check(ip, "ipv4");
  if (family === 6) return BLOCKED.check(ip, "ipv6");
  return true;
}

/** ホスト名または IP リテラルが取得・埋め込みに使えないなら true。DNS は見ない。 */
export function isBlockedHostname(hostname: string): boolean {
  const host = stripHost(hostname);
  if (!host) return true;
  if (isIP(host) !== 0) return isBlockedIp(host);
  if (BLOCKED_HOST_NAMES.has(host)) return true;
  return (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain")
  );
}

function isCredentialFreeHttpUrl(url: URL, protocols: readonly string[]): boolean {
  if (!protocols.includes(url.protocol)) return false;
  if (url.username || url.password) return false;
  return !isBlockedHostname(url.hostname);
}

/** 記事リンクとしてページに出してよい http(s) URL。javascript: や data: は拒否する。 */
export function isSafeNavigationUrl(raw: string): boolean {
  try {
    return isCredentialFreeHttpUrl(new URL(raw), ["http:", "https:"]);
  } catch {
    return false;
  }
}

/** og:image など、ブラウザが読み込む画像 URL。https のみ。 */
export function isSafeImageUrl(raw: string): boolean {
  try {
    return isCredentialFreeHttpUrl(new URL(raw), ["https:"]);
  } catch {
    return false;
  }
}

/**
 * feeds.json に書いてよい取得先。https の 443 のみ。
 * 名前解決は取得時に行い、ここではリテラルと予約ホスト名だけを見る。
 */
export function isAllowedFeedUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.port !== "" && url.port !== "443") return false;
    return isCredentialFreeHttpUrl(url, ["https:"]);
  } catch {
    return false;
  }
}
