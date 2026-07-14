import { describe, expect, it } from "vitest";
import { groupByGenre } from "../genre.js";
import { extractOgImage } from "../ogp.js";
import type { Article, ArticleClassification } from "../types.js";

function makeArticle(url: string): Article {
  return {
    title: `記事 ${url}`,
    url,
    sources: ["feed-a"],
    sourceNames: ["フィードA"],
    publishedAt: null,
    excerpt: "",
    lang: "ja",
    meta: {},
  };
}

describe("groupByGenre", () => {
  const articles = ["https://example.com/1", "https://example.com/2", "https://example.com/3", "https://example.com/4"].map(makeArticle);
  const classifications: ArticleClassification[] = [
    { url: "https://example.com/1", genre: "web", stars: 1 },
    { url: "https://example.com/2", genre: "ai-llm", stars: 2 },
    { url: "https://example.com/3", genre: "web", stars: 3 },
  ];

  it("ジャンルごとにまとめ、記事数の多い順に並べる", () => {
    const groups = groupByGenre(articles, classifications);
    expect(groups.map((g) => g.genre.id)).toEqual(["web", "ai-llm", "misc"]);
  });

  it("ジャンル内は★の高い順に並べる", () => {
    const groups = groupByGenre(articles, classifications);
    expect(groups[0]?.articles.map((a) => a.stars)).toEqual([3, 1]);
  });

  it("分類がない記事は「その他」★1 に落ち、常に最後のセクションになる", () => {
    const groups = groupByGenre(articles, classifications);
    const misc = groups.at(-1);
    expect(misc?.genre.id).toBe("misc");
    expect(misc?.articles).toHaveLength(1);
    expect(misc?.articles[0]?.stars).toBe(1);
  });

  it("分類が全記事分あれば「その他」セクションは作られない", () => {
    const groups = groupByGenre(articles.slice(0, 3), classifications);
    expect(groups.some((g) => g.genre.id === "misc")).toBe(false);
  });
});

describe("extractOgImage", () => {
  it("og:image の content を取り出す", () => {
    const html = '<head><meta property="og:image" content="https://example.com/thumb.png"></head>';
    expect(extractOgImage(html)).toBe("https://example.com/thumb.png");
  });

  it("content が先に来る属性順にも対応する", () => {
    const html = "<meta content='https://example.com/t.jpg' property='og:image'>";
    expect(extractOgImage(html)).toBe("https://example.com/t.jpg");
  });

  it("og:image がなければ null", () => {
    expect(extractOgImage("<head><title>x</title></head>")).toBeNull();
  });
});
