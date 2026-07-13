import { describe, expect, it } from "vitest";
import { canonicalizeUrl, dedupeArticles } from "../dedupe.js";
import type { Article, FeedConfig, FeedResult } from "../types.js";

function makeArticle(overrides: Partial<Article>): Article {
  return {
    title: "タイトル",
    url: "https://example.com/a",
    sources: ["feed-a"],
    sourceNames: ["フィードA"],
    publishedAt: null,
    excerpt: "",
    lang: "ja",
    meta: {},
    ...overrides,
  };
}

function makeResult(feedId: string, articles: Article[]): FeedResult {
  const feed: FeedConfig = {
    id: feedId,
    name: feedId,
    url: `https://example.com/${feedId}.rss`,
    lang: "ja",
    maxItems: 10,
  };
  return { feed, articles };
}

describe("canonicalizeUrl", () => {
  it("http/https の揺れを吸収する", () => {
    expect(canonicalizeUrl("http://example.com/a")).toBe(
      canonicalizeUrl("https://example.com/a"),
    );
  });

  it("トラッキングパラメータを除去し、必要なパラメータは残す", () => {
    expect(
      canonicalizeUrl("https://example.com/a?utm_source=x&utm_campaign=y&id=1"),
    ).toBe("https://example.com/a?id=1");
  });

  it("末尾スラッシュとフラグメントを吸収する", () => {
    expect(canonicalizeUrl("https://example.com/a/#section")).toBe(
      "https://example.com/a",
    );
  });

  it("ルートパスのスラッシュは残す", () => {
    expect(canonicalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("URLとして解釈できない文字列はそのまま返す", () => {
    expect(canonicalizeUrl("not a url")).toBe("not a url");
  });
});

describe("dedupeArticles", () => {
  it("同一URLの記事を統合し sources をマージする", () => {
    const results = [
      makeResult("feed-a", [
        makeArticle({ url: "https://example.com/a?utm_source=rss" }),
      ]),
      makeResult("feed-b", [
        makeArticle({
          url: "http://example.com/a",
          sources: ["feed-b"],
          sourceNames: ["フィードB"],
          excerpt: "後から来た抜粋",
        }),
      ]),
    ];
    const deduped = dedupeArticles(results);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.sources).toEqual(["feed-a", "feed-b"]);
    expect(deduped[0]?.sourceNames).toEqual(["フィードA", "フィードB"]);
    expect(deduped[0]?.excerpt).toBe("後から来た抜粋");
  });

  it("異なるURLは統合しない", () => {
    const results = [
      makeResult("feed-a", [
        makeArticle({ url: "https://example.com/a" }),
        makeArticle({ url: "https://example.com/b" }),
      ]),
    ];
    expect(dedupeArticles(results)).toHaveLength(2);
  });

  it("先勝ちで記事内容を保持しつつメタ情報は補完する", () => {
    const results = [
      makeResult("feed-a", [
        makeArticle({ title: "先の記事", meta: { points: 10 } }),
      ]),
      makeResult("feed-b", [
        makeArticle({
          title: "後の記事",
          sources: ["feed-b"],
          sourceNames: ["フィードB"],
          meta: { points: 99, comments: 5 },
        }),
      ]),
    ];
    const deduped = dedupeArticles(results);
    expect(deduped[0]?.title).toBe("先の記事");
    expect(deduped[0]?.meta).toEqual({ points: 10, comments: 5 });
  });
});
