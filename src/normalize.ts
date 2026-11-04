import type Parser from "rss-parser";
import type { Article, FeedConfig } from "./types.js";
import { isSafeNavigationUrl } from "./urlSafety.js";

const EXCERPT_MAX_LENGTH = 300;
const TITLE_MAX_LENGTH = 500;

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/�/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/**
 * hnrss.org の description は
 * "Article URL: ... / Comments URL: ... / Points: N / # Comments: N"
 * という定型文なので、excerpt には使わずメタ情報として抽出する。
 */
export function parseHnMeta(snippet: string): Article["meta"] | null {
  if (!/^Article URL:/m.test(snippet)) return null;
  const points = snippet.match(/^Points:\s*(\d+)/m);
  const comments = snippet.match(/^#\s*Comments:\s*(\d+)/m);
  const commentsUrl = snippet.match(/^Comments URL:\s*(\S+)/m);
  const commentsHref = commentsUrl?.[1];
  return {
    ...(points?.[1] !== undefined && { points: Number(points[1]) }),
    ...(comments?.[1] !== undefined && { comments: Number(comments[1]) }),
    ...(commentsHref !== undefined &&
      isSafeNavigationUrl(commentsHref) && { commentsUrl: commentsHref }),
  };
}

export function normalizeItem(
  item: Parser.Item,
  feed: FeedConfig,
): Article | null {
  const rawUrl = item.link?.trim();
  const title = item.title ? truncate(stripHtml(item.title), TITLE_MAX_LENGTH) : "";
  if (!rawUrl || !title) return null;
  let url: string;
  try {
    url = new URL(rawUrl, feed.url).href;
  } catch {
    return null;
  }
  if (!isSafeNavigationUrl(url)) return null;

  const rawSnippet =
    item.contentSnippet ?? item.summary ?? item.content ?? "";
  const hnMeta = parseHnMeta(rawSnippet);
  const excerpt = hnMeta
    ? ""
    : truncate(stripHtml(rawSnippet), EXCERPT_MAX_LENGTH);

  let publishedAt: string | null = null;
  const dateSource = item.isoDate ?? item.pubDate;
  if (dateSource) {
    const parsed = new Date(dateSource);
    if (!Number.isNaN(parsed.getTime())) publishedAt = parsed.toISOString();
  }

  return {
    title,
    url,
    sources: [feed.id],
    sourceNames: [feed.name],
    publishedAt,
    excerpt,
    lang: feed.lang,
    meta: hnMeta ?? {},
  };
}

export function normalizeFeed(
  items: Parser.Item[],
  feed: FeedConfig,
): Article[] {
  return items
    .map((item) => normalizeItem(item, feed))
    .filter((article): article is Article => article !== null)
    .slice(0, feed.maxItems);
}
