import { describe, expect, it } from "vitest";
import {
  cleanExcerpt,
  normalizeFeed,
  normalizeItem,
  parseHnMeta,
  stripHtml,
  truncate,
} from "../normalize.js";
import { renderDigest } from "../render.js";
import type { Article, DigestData, FeedConfig } from "../types.js";

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

  it("危険な Comments URL は捨て、点数は残す", () => {
    expect(
      parseHnMeta(
        "Article URL: https://example.com/a\nComments URL: javascript:alert(1)\nPoints: 3\n# Comments: 1",
      ),
    ).toEqual({ points: 3, comments: 1 });
  });

  it("Article URL 行が無くても、1行の定型から点数とコメントを拾う", () => {
    expect(
      parseHnMeta(
        "https://x.com/SpaceX/status/2121316300702056595 https://youtu.be/jHlpfNSpBmw?t=3233 Comments URL: https://news.ycombinator.com/item?id=50500963 Points: 689 # Comments: 459",
      ),
    ).toEqual({
      points: 689,
      comments: 459,
      commentsUrl: "https://news.ycombinator.com/item?id=50500963",
    });
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

  it("javascript スキームや非公開アドレスは捨てる", () => {
    expect(normalizeItem({ title: "x", link: "javascript:alert(1)" }, jaFeed)).toBeNull();
    expect(normalizeItem({ title: "x", link: "data:text/html,hi" }, jaFeed)).toBeNull();
    expect(normalizeItem({ title: "x", link: "https://127.0.0.1/secret" }, jaFeed)).toBeNull();
    expect(normalizeItem({ title: "x", link: "https://2130706433/secret" }, jaFeed)).toBeNull();
  });

  it("相対 URL はフィード URL を基準に https へ解決する", () => {
    const article = normalizeItem({ title: "相対", link: "/p/1" }, jaFeed);
    expect(article?.url).toBe("https://example.com/p/1");
  });

  it("不正な日付は null にする", () => {
    const article = normalizeItem(
      { title: "t", link: "https://example.com/x", pubDate: "not-a-date" },
      jaFeed,
    );
    expect(article?.publishedAt).toBeNull();
  });
});

const SPACEX_EXCERPT =
  "https://x.com/SpaceX/status/2121316300702056595 https://youtu.be/jHlpfNSpBmw?t=3233 Comments URL: https://news.ycombinator.com/item?id=50500963 Points: 689 # Comments: 459";

const HATENA_EXCERPT =
  "以下のURLを私のClaude Codeに渡して、スライドをポン出しする実験です。 https://claude.com/ja/resources/articles/building-always-on-agents";

const HATENA_PROSE = "以下のURLを私のClaude Codeに渡して、スライドをポン出しする実験です。";

function digestOf(article: Article): DigestData {
  return {
    date: "2026-11-15",
    generatedAt: "2026-11-15T22:00:00.000Z",
    feedResults: [
      {
        feed: {
          id: article.sources[0] ?? "sample",
          name: article.sourceNames[0] ?? "sample",
          url: "https://example.com/feed",
          lang: article.lang,
          maxItems: 15,
        },
        articles: [article],
      },
    ],
    articles: [article],
    aiSummary: {
      dailyOverview: "概況",
      topPicks: [],
      enSummaries: [],
      classifications: [{ url: article.url, genre: "science", stars: 2 }],
    },
  };
}

function articleBlock(html: string, title: string): string {
  const start = html.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  return html.slice(start, html.indexOf("</li>", start));
}

describe("抜粋から定型文と裸の URL を除く", () => {
  it("HN の URL と定型文だけなら抜粋行を出さず、点数とコメント数はメタに残す", () => {
    expect(cleanExcerpt(SPACEX_EXCERPT)).toBe("");
    const article = normalizeItem(
      {
        title: "SpaceX catches the Starship to end Flight 15",
        link: "https://www.spacex.com/launches/starship-flight-15",
        contentSnippet: SPACEX_EXCERPT,
      },
      hnFeed,
    );
    expect(article?.excerpt).toBe("");
    expect(article?.meta).toEqual({
      points: 689,
      comments: 459,
      commentsUrl: "https://news.ycombinator.com/item?id=50500963",
    });

    const html = renderDigest(digestOf(article!), { archiveIndexHref: "archive/" });
    const block = articleBlock(html, article!.title);
    expect(block).toContain("▲ 689");
    expect(block).toContain(
      '<a href="https://news.ycombinator.com/item?id=50500963">459 comments</a>',
    );
    expect(block).not.toContain("article-excerpt");
    expect(block).not.toContain("本文情報なし");
    expect(block).not.toContain("https://x.com/");
    expect(block).not.toContain("youtu.be");
    expect(block).not.toContain("Comments URL");
    expect(html).not.toContain("本文情報なし");
  });

  it("文章に付いた裸の URL は除き、文章は抜粋に残す", () => {
    expect(cleanExcerpt(HATENA_EXCERPT)).toBe(HATENA_PROSE);
    const article = normalizeItem(
      {
        title: "常時稼働エージェントの作り方（Claude公式ブログを資料化）",
        link: "https://speakerdeck.com/minorun365/jouji-kadou-ejento-no-tsukurikata",
        contentSnippet: HATENA_EXCERPT,
      },
      jaFeed,
    );
    expect(article?.excerpt).toBe(HATENA_PROSE);
    expect(article?.meta).toEqual({});

    const html = renderDigest(digestOf(article!), { archiveIndexHref: "archive/" });
    const block = articleBlock(html, article!.title);
    expect(block).toContain(`<p class="article-excerpt excerpt-clamp">${HATENA_PROSE}</p>`);
    expect(block).not.toContain("https://claude.com/");
    expect(block).not.toContain("本文情報なし");
  });

  it("本文のうしろに続く HN 定型は除き、本文とメタは残す", () => {
    const article = normalizeItem(
      {
        title: "Anatomy of a Texture",
        link: "https://example.com/texture",
        contentSnippet:
          "I just uploaded a new article describing how a modern video game texture is stored. Comments URL: https://news.ycombinator.com/item?id=49727592 Points: 71 # Comments: 12",
      },
      hnFeed,
    );
    expect(article?.excerpt).toBe(
      "I just uploaded a new article describing how a modern video game texture is stored.",
    );
    expect(article?.meta).toEqual({
      points: 71,
      comments: 12,
      commentsUrl: "https://news.ycombinator.com/item?id=49727592",
    });
  });

  it("短い説明は残し、付いた URL だけを除く", () => {
    const article = normalizeItem(
      {
        title: "短い",
        link: "https://example.com/short",
        contentSnippet: "本文の抜粋 https://example.com/a",
      },
      jaFeed,
    );
    expect(article?.excerpt).toBe("本文の抜粋");
  });

  it("URL や記号だけが残る抜粋は空にする", () => {
    expect(cleanExcerpt("… https://example.com/a")).toBe("");
    expect(cleanExcerpt("a https://example.com/a")).toBe("");
    const article = normalizeItem(
      {
        title: "link",
        link: "https://example.com/only",
        contentSnippet: "(https://example.com/a)",
      },
      jaFeed,
    );
    expect(article?.excerpt).toBe("");
  });

  it("HTML の HN 定型はラベルだけ残さず、抜粋行を出さない", () => {
    const description = [
      '<p>Article URL: https://example.com</p>',
      '<p>Comments URL: <a href="https://news.ycombinator.com/item?id=1">https://news.ycombinator.com/item?id=1</a></p>',
      "<p>Points: 164</p>",
      "<p># Comments: 72</p>",
    ].join("");
    expect(cleanExcerpt(description)).toBe("");

    const article = normalizeItem(
      {
        title: "OpenCode Browse",
        link: "https://opencode.ai/product/browse",
        contentSnippet: description,
      },
      hnFeed,
    );
    expect(article?.excerpt).toBe("");
    expect(article?.meta).toEqual({
      points: 164,
      comments: 72,
      commentsUrl: "https://news.ycombinator.com/item?id=1",
    });

    const html = renderDigest(digestOf(article!), { archiveIndexHref: "archive/" });
    const block = articleBlock(html, article!.title);
    expect(block).toContain("▲ 164");
    expect(block).toContain(
      '<a href="https://news.ycombinator.com/item?id=1">72 comments</a>',
    );
    expect(block).not.toContain("article-excerpt");
    expect(block).not.toContain("Comments URL");
    expect(block).not.toContain("Article URL");
    expect(block).not.toContain("Points:");
    expect(block).not.toContain("# Comments:");
    expect(html).not.toMatch(/<p class="article-excerpt/);
  });

  it("プレーンテキストの定型も、値の有無・並び・空白にかかわらず抜粋を空にする", () => {
    const multiline = [
      "Article URL: https://example.com",
      "Comments URL: https://news.ycombinator.com/item?id=1",
      "Points: 164",
      "# Comments: 72",
    ].join("\n");
    const oneLine =
      "Article URL: https://example.com Comments URL: https://news.ycombinator.com/item?id=1 Points: 164 # Comments: 72";
    expect(cleanExcerpt(multiline)).toBe("");
    expect(cleanExcerpt(oneLine)).toBe("");
    expect(cleanExcerpt("Comments URL:\nArticle URL:\nPoints:\n# Comments:")).toBe("");
    expect(cleanExcerpt("Comments URL:")).toBe("");
    expect(cleanExcerpt("Article URL:")).toBe("");
    expect(cleanExcerpt("Points:")).toBe("");
    expect(cleanExcerpt("# Comments:")).toBe("");
    expect(cleanExcerpt("Article URL:Comments URL:Points:# Comments:")).toBe("");
    expect(cleanExcerpt("# Comments: 1\nPoints:\nComments URL:\nArticle URL:")).toBe("");
    expect(
      cleanExcerpt("Article   URL:\n\nComments\tURL:\nPoints:\t\n#   Comments:   "),
    ).toBe("");
  });

  it("本文の前に付いた HTML の定型だけを除き、本文は残す", () => {
    const description =
      "<p>Launch notes for the flight.</p>" +
      '<p>Article URL: https://example.com</p>' +
      '<p>Comments URL: <a href="https://news.ycombinator.com/item?id=1">https://news.ycombinator.com/item?id=1</a></p>' +
      "<p>Points: 164</p><p># Comments: 72</p>";
    expect(cleanExcerpt(description)).toBe("Launch notes for the flight.");
  });

  it("HN 以外の本文は定型ラベルの除去で変えない", () => {
    expect(cleanExcerpt("The main points: clarity and speed matter here.")).toBe(
      "The main points: clarity and speed matter here.",
    );
    expect(
      cleanExcerpt("There were many comments: the API is stable. https://example.com/docs"),
    ).toBe("There were many comments: the API is stable.");
    expect(cleanExcerpt("本文の抜粋です。ポイントは速度です。")).toBe(
      "本文の抜粋です。ポイントは速度です。",
    );
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
