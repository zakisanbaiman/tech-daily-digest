import type { Article, FeedResult } from "./types.js";

const TRACKING_PARAMS = [
  /^utm_/,
  /^gclid$/,
  /^fbclid$/,
  /^ref$/,
  /^source$/,
];

/**
 * 重複判定用の正規化キーを作る。
 * http/https の揺れ、トラッキングパラメータ、末尾スラッシュ、フラグメントを吸収する。
 */
export function canonicalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  url.protocol = "https:";
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  let result = url.toString();
  if (url.pathname !== "/" && result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result;
}

/**
 * フィード横断で重複記事を統合する。
 * 複数フィードに載った記事は sources を統合し、最初に現れた記事の内容を優先する。
 * 返り値はフィード定義順 → フィード内の順を保った一覧。
 */
export function dedupeArticles(feedResults: FeedResult[]): Article[] {
  const byUrl = new Map<string, Article>();
  for (const { articles } of feedResults) {
    for (const article of articles) {
      const key = canonicalizeUrl(article.url);
      const existing = byUrl.get(key);
      if (!existing) {
        byUrl.set(key, { ...article, meta: { ...article.meta } });
        continue;
      }
      for (const [i, source] of article.sources.entries()) {
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
          existing.sourceNames.push(article.sourceNames[i]!);
        }
      }
      if (!existing.excerpt && article.excerpt) {
        existing.excerpt = article.excerpt;
      }
      existing.meta = { ...article.meta, ...existing.meta };
    }
  }
  return [...byUrl.values()];
}
