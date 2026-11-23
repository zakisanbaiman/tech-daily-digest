import type Parser from "rss-parser";
import type { Article, FeedConfig } from "./types.js";
import { summarySourceText } from "./summarySource.js";
import { isSafeNavigationUrl } from "./urlSafety.js";

const EXCERPT_MAX_LENGTH = 300;
const TITLE_MAX_LENGTH = 500;

/**
 * 定型と URL を除いたあとに残す最短の文字数。
 * 「本文の抜粋」のような短い説明は残す。空や、記号・1文字だけの残骸は捨てる。
 */
const MIN_EXCERPT_CONTENT_CHARS = 2;

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

function lastCapture(text: string, source: string): string | undefined {
  const re = new RegExp(source, "gi");
  let found: string | undefined;
  for (const match of text.matchAll(re)) {
    const value = match[1];
    if (value !== undefined) found = value;
  }
  return found;
}

/** 末尾の括弧や句読点はコメント URL に含めない */
function trimUrlToken(raw: string): string {
  return raw.replace(/[),.;:!?]+$/g, "");
}

/**
 * hnrss の description には
 * "Article URL: ... / Comments URL: ... / Points: N / # Comments: N"
 * が付く。行頭の Article URL が無く、本文や裸の URL のあとに 1 行で続くこともある。
 * 点数とコメント数は抜粋ではなく、既存の ▲ N · M comments 用メタとして取り出す。
 */
export function parseHnMeta(snippet: string): Article["meta"] | null {
  const plain = stripHtml(snippet);
  const hasMarker =
    /Article\s+URL:/i.test(plain) ||
    /Comments\s+URL:/i.test(plain) ||
    /#\s*Comments:\s*\d+/i.test(plain);
  if (!hasMarker) return null;

  const points = lastCapture(plain, "Points:\\s*(\\d+)");
  const comments = lastCapture(plain, "#\\s*Comments:\\s*(\\d+)");
  const commentsRaw = lastCapture(plain, "Comments\\s+URL:\\s*(\\S+)");
  const commentsHref = commentsRaw === undefined ? undefined : trimUrlToken(commentsRaw);
  const meta: Article["meta"] = {
    ...(points !== undefined && { points: Number(points) }),
    ...(comments !== undefined && { comments: Number(comments) }),
    ...(commentsHref !== undefined &&
      isSafeNavigationUrl(commentsHref) && { commentsUrl: commentsHref }),
  };
  if (
    meta.points === undefined &&
    meta.comments === undefined &&
    meta.commentsUrl === undefined
  ) {
    return null;
  }
  return meta;
}

function tidyExcerpt(text: string): string {
  return text
    .replace(/[（(]\s*[)）]/g, " ")
    .replace(/[「『]\s*[」』]/g, " ")
    .replace(/\[\s*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentChars(text: string): number {
  return text.match(/\p{L}|\p{N}/gu)?.length ?? 0;
}

/**
 * 抜粋から HN の定型文、GitHub の UI 文言、裸の http(s) URL を除く。
 * 残った文字列が空、または中身が極端に短いときは空文字にし、抜粋行自体を出さない。
 */
export function cleanExcerpt(raw: string): string {
  const text = tidyExcerpt(summarySourceText(stripHtml(raw)));
  if (contentChars(text) < MIN_EXCERPT_CONTENT_CHARS) return "";
  return truncate(text, EXCERPT_MAX_LENGTH);
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
  const excerpt = cleanExcerpt(rawSnippet);

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
