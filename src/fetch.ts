import Parser from "rss-parser";
import { normalizeFeed } from "./normalize.js";
import type { FeedConfig, FeedResult } from "./types.js";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "tech-daily-digest/0.1 (+https://github.com)";

const parser = new Parser();

async function fetchFeed(feed: FeedConfig): Promise<FeedResult> {
  const response = await fetch(feed.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  const parsed = await parser.parseString(xml);
  return { feed, articles: normalizeFeed(parsed.items ?? [], feed) };
}

/** 全フィードを並列取得。失敗したフィードは error 付きの空結果にして他は継続する */
export async function fetchAllFeeds(
  feeds: FeedConfig[],
): Promise<FeedResult[]> {
  const settled = await Promise.allSettled(feeds.map(fetchFeed));
  return settled.map((result, i) => {
    const feed = feeds[i]!;
    if (result.status === "fulfilled") return result.value;
    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    console.error(`[fetch] ${feed.id} failed: ${reason}`);
    return { feed, articles: [], error: reason };
  });
}
