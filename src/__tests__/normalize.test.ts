import { describe, expect, it } from "vitest";
import { normalizeFeed, normalizeItem, parseHnMeta, stripHtml, truncate } from "../normalize.js";
import type { FeedConfig } from "../types.js";

const jaFeed: FeedConfig = {
  id: "sample-ja",
  name: "サンプルJP",
  url: "https://example.com/feed",
  lang: "ja",
  maxItems: 2,
};

const hnFeed: FeedConfig = {
  id: "sample-hn",
  name: "Sample HN",
  url: "https://example.com/frontpage",
  lang: "en",
  maxItems: 10,
};

describe("stripHtml", () => {
  it("タグ除去・エンティティ復元・空白圧縮を行う", () => {
    expect(stripHtml("<p>foo &amp; <b>bar</b></p>\n  baz")).toBe("foo & bar baz");
  });

  it("フィード側の壊れたバイト列（U+FFFD）を除去する", () => {
    expect(stripHtml("text 0�B �� end")).toBe("text 0B end");
  });
});

describe("truncate", () => {
  it("上限を超えたら省略記号を付ける", () => {
    expect(truncate("abcdef", 3)).toBe("abc…");
    expect(truncate("abc", 3)).toBe("abc");
  });
});

describe("parseHnMeta", () => {
  const snippet = [
    "Article URL: https://example.com/post",
    "Comments URL: https://news.ycombinator.com/item?id=1",
    "Points: 123",
    "# Comments: 45",
  ].join("\n");

  it("hnrss 定型文からメタ情報を抽出する", () => {
    expect(parseHnMeta(snippet)).toEqual({
      points: 123,
      comments: 45,
      commentsUrl: "https://news.ycombinator.com/item?id=1",
    });
  });

  it("通常の本文には反応しない", () => {
    expect(parseHnMeta("普通の記事の抜粋です。")).toBeNull();
  });
});

describe("normalizeItem", () => {
  it("RSSアイテムを Article に変換する", () => {
    const article = normalizeItem(
      {
        title: "テスト記事",
        link: "https://example.com/article ",
        contentSnippet: "本文の抜粋",
        isoDate: "2026-07-13T00:00:00.000Z",
      },
      jaFeed,
    );
    expect(article).toEqual({
      title: "テスト記事",
      url: "https://example.com/article",
      sources: ["sample-ja"],
      sourceNames: ["サンプルJP"],
      publishedAt: "2026-07-13T00:00:00.000Z",
      excerpt: "本文の抜粋",
      lang: "ja",
      meta: {},
    });
  });

  it("hnrss アイテムは excerpt を空にしてメタ情報を持つ", () => {
    const article = normalizeItem(
      {
        title: "Show HN: Something",
        link: "https://example.com/show",
        contentSnippet: "Article URL: https://example.com/show\nPoints: 10\n# Comments: 2",
      },
      hnFeed,
    );
    expect(article?.excerpt).toBe("");
    expect(article?.meta).toEqual({ points: 10, comments: 2 });
  });

  it("タイトルやURLが欠けたアイテムは捨てる", () => {
    expect(normalizeItem({ title: "リンクなし" }, jaFeed)).toBeNull();
    expect(normalizeItem({ link: "https://example.com/x" }, jaFeed)).toBeNull();
  });

  it("不正な日付は null にする", () => {
    const article = normalizeItem(
      { title: "t", link: "https://example.com/x", pubDate: "not-a-date" },
      jaFeed,
    );
    expect(article?.publishedAt).toBeNull();
  });
});

describe("normalizeFeed", () => {
  it("maxItems で件数を制限する", () => {
    const items = [1, 2, 3].map((n) => ({
      title: `記事${n}`,
      link: `https://example.com/${n}`,
    }));
    const articles = normalizeFeed(items, jaFeed);
    expect(articles).toHaveLength(2);
    expect(articles.map((a) => a.title)).toEqual(["記事1", "記事2"]);
  });
});
