import Parser from "rss-parser";
import { normalizeFeed } from "./normalize.js";
import { SafeFetchError, safeFetchText } from "./safeFetch.js";
import type { FeedConfig, FeedResult } from "./types.js";

const FETCH_TIMEOUT_MS = 15_000;
const FEED_MAX_BYTES = 5_000_000;
const USER_AGENT = "tech-daily-digest/0.1 (+https://github.com)";

const parser = new Parser();

/**
 * DTD / 実体宣言はルート要素より前にあるときだけ拒否する。
 * 記事本文での `<!DOCTYPE` 言及ではフィード全体を落とさない。
 */
export function assertSafeFeedXml(xml: string): void {
  const head = xml.slice(0, 8000);
  const rootAt = head.search(/<(rss|feed|rdf:RDF)\b/i);
  const prolog = rootAt === -1 ? head : head.slice(0, rootAt);
  if (/<!DOCTYPE|<!ENTITY/i.test(prolog)) {
    throw new SafeFetchError("feed XML contains a DTD", "フィードの形式が不正です");
  }
}

function oneLine(value: string): string {
  return value.replace(/[\r\n\t]/g, " ").slice(0, 300);
}

/** 公開ページに出してよい失敗理由。内部アドレスや応答本文は含めない。 */
export function publicFetchMessage(error: unknown): string {
  if (error instanceof SafeFetchError) return error.publicMessage;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "タイムアウト";
  }
  return "取得できませんでした";
}

async function fetchFeed(feed: FeedConfig): Promise<FeedResult> {
  const xml = await safeFetchText(feed.url, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: FEED_MAX_BYTES,
    userAgent: USER_AGENT,
    onOverflow: "error",
  });
  assertSafeFeedXml(xml);
  try {
    const parsed = await parser.parseString(xml);
    return { feed, articles: normalizeFeed(parsed.items ?? [], feed) };
  } catch (error) {
    if (error instanceof SafeFetchError) throw error;
    const detail = error instanceof Error ? error.message : "invalid xml";
    console.error(
      `[fetch] ${feed.id} XML parse failed: ${detail.replace(/[\r\n]/g, " ").slice(0, 300)}`,
    );
    throw new SafeFetchError(`invalid feed XML for ${feed.id}`, "フィードの形式が不正です");
  }
}

/** 全フィードを並列取得。失敗したフィードは error 付きの空結果にして他は継続する */
export async function fetchAllFeeds(feeds: FeedConfig[]): Promise<FeedResult[]> {
  const settled = await Promise.allSettled(feeds.map(fetchFeed));
  return settled.map((result, i) => {
    const feed = feeds[i]!;
    if (result.status === "fulfilled") return result.value;
    const detail =
      result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error(`[fetch] ${feed.id} failed: ${oneLine(detail)}`);
    return { feed, articles: [], error: publicFetchMessage(result.reason) };
  });
}
