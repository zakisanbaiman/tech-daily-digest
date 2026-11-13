import { describe, expect, it } from "vitest";
import { renderDigest } from "../render.js";
import {
  MIN_SUMMARY_SOURCE_CHARS,
  hasSummarizableSource,
  selectGroundedSummaries,
} from "../summarySource.js";
import type { AiSummary, Article, DigestData } from "../types.js";

const COLD_FRAME =
  "I built Coldframe, a honeypot that pretends to be a supermarket refrigeration controller. Inspired by recent attacks, it records what people try against a convincing fake.";

const HN_BOILERPLATE = [
  "Article URL: https://example.com/post",
  "Comments URL: https://news.ycombinator.com/item?id=1",
  "Points: 123",
  "# Comments: 45",
].join("\n");

const LINK_DUMP =
  "https://archive.is/AaY5O https://businessexaminer.ca/victoria-articles/item/microsoft... Comments URL: https://news.ycombinator.com/item?id=50406563 Points: 366 # Comments: 210";

function article(partial: Pick<Article, "url" | "title" | "excerpt"> & Partial<Article>): Article {
  return {
    sources: ["hackernews"],
    sourceNames: ["Hacker News"],
    publishedAt: null,
    lang: "en",
    meta: {},
    ...partial,
  };
}

describe("hasSummarizableSource", () => {
  it("空や空白だけの抜粋は要約できない", () => {
    expect(hasSummarizableSource("")).toBe(false);
    expect(hasSummarizableSource("  \n\t")).toBe(false);
  });

  it("URL と Hacker News の定型だけでは要約できない", () => {
    expect(hasSummarizableSource(HN_BOILERPLATE, "Shadow of the Sun (2021)")).toBe(false);
    expect(
      hasSummarizableSource(LINK_DUMP, "The end of Microsoft Research's AI Frontiers group"),
    ).toBe(false);
    expect(hasSummarizableSource("Points: 366 # Comments: 210")).toBe(false);
  });

  it("タイトルそのものや末尾の省略記号だけでは要約できない", () => {
    const title = "GitHub New pull request overview page in public preview";
    expect(title.length).toBeGreaterThanOrEqual(MIN_SUMMARY_SOURCE_CHARS);
    expect(hasSummarizableSource(title, title)).toBe(false);
    expect(hasSummarizableSource(`${title}…`, title)).toBe(false);
    expect(hasSummarizableSource(`${title} (2026)`, title)).toBe(false);

    const dashed = "Commodore PET – The Worlds First Personal Computer";
    expect(hasSummarizableSource(dashed.replace("–", "-"), dashed)).toBe(false);
  });

  it("タイトルに本文が続いていれば要約できる", () => {
    const title = "GitHub New pull request overview page in public preview";
    const excerpt = `${title}. The page groups changed files by review status and highlights unresolved threads for the author.`;
    expect(hasSummarizableSource(excerpt, title)).toBe(true);
  });

  it("十分な本文がある抜粋は要約できる", () => {
    expect(hasSummarizableSource(COLD_FRAME, "Show HN: Coldframe")).toBe(true);
    expect(hasSummarizableSource("a".repeat(MIN_SUMMARY_SOURCE_CHARS))).toBe(true);
    expect(hasSummarizableSource("a".repeat(MIN_SUMMARY_SOURCE_CHARS - 1))).toBe(false);
  });

  it("URL の文字数は本文の長さに数えない", () => {
    const url = "https://example.com/very/long/path/that/is/not/the/article";
    expect(hasSummarizableSource(`${url} ${"a".repeat(MIN_SUMMARY_SOURCE_CHARS - 1)}`)).toBe(false);
    expect(hasSummarizableSource(`${url} ${"a".repeat(MIN_SUMMARY_SOURCE_CHARS)}`)).toBe(true);
  });
});

describe("selectGroundedSummaries", () => {
  const thin = article({
    url: "https://example.com/thin",
    title: "Shadow of the Sun (2021)",
    excerpt: "",
  });
  const dumped = article({
    url: "https://example.com/dump",
    title: "The end of Microsoft Research's AI Frontiers group",
    excerpt: LINK_DUMP,
  });
  const rich = article({
    url: "https://example.com/rich",
    title: "Show HN: Coldframe",
    excerpt: COLD_FRAME,
  });

  it("材料が足りない記事の推測要約を落とし、本文がある要約だけ残す", () => {
    const grounded = "スーパーの冷蔵設備を装うハニーポットの紹介です。";
    const selected = selectGroundedSummaries(
      [thin, dumped, rich],
      [
        {
          url: thin.url,
          summaryJa: "太陽の影をテーマに、光や時間、観察に関する考察をまとめた記事とみられます。",
        },
        {
          url: dumped.url,
          summaryJa: "研究組織の再編や、AI研究戦略の変化を考える材料です。",
        },
        { url: rich.url, summaryJa: grounded },
        { url: "https://example.com/unknown", summaryJa: "一覧に無い記事です。" },
      ],
    );
    expect(selected).toEqual([{ url: rich.url, summaryJa: grounded }]);
  });
});

describe("renderDigest の要約表示", () => {
  function digest(articles: Article[], aiSummary: AiSummary | null): DigestData {
    return {
      date: "2026-11-08",
      generatedAt: "2026-11-08T01:15:51.000Z",
      feedResults: [
        {
          feed: {
            id: "hackernews",
            name: "Hacker News",
            url: "https://hnrss.org/frontpage",
            lang: "en",
            maxItems: 15,
          },
          articles,
        },
      ],
      articles,
      aiSummary,
    };
  }

  const thin = article({
    url: "https://mattlakeman.org/2021/07/27/shadow-of-the-sun/",
    title: "Shadow of the Sun (2021)",
    excerpt: "",
    meta: {
      points: 409,
      comments: 391,
      commentsUrl: "https://news.ycombinator.com/item?id=50458900",
    },
  });
  const blank = article({
    url: "https://example.com/blank",
    title: "空白だけの抜粋",
    excerpt: " \n\t ",
  });
  const placeholder = article({
    url: "https://example.com/placeholder",
    title: "定型文だけの抜粋",
    excerpt: "  本文情報なし  ",
  });
  const titled = article({
    url: "https://github.blog/changelog/2026-11-05-new-pull-request-overview-page-in-public-preview/",
    title: "GitHub New pull request overview page in public preview",
    excerpt: "GitHub New pull request overview page in public preview",
  });
  const rich = article({
    url: "https://github.com/hedgerow-dev/coldframe",
    title: "Show HN: Coldframe, a honeypot that poses as a supermarket fridge controller",
    excerpt: COLD_FRAME,
  });
  const japanese = article({
    url: "https://example.com/ja",
    title: "日本語の記事",
    excerpt: "",
    lang: "ja",
    sources: ["zenn"],
    sourceNames: ["Zenn トレンド"],
  });

  const speculated = "太陽の影をテーマに、光や時間、観察に関する考察をまとめた記事とみられます。";
  const grounded = "スーパーの冷蔵設備を装うハニーポットの紹介です。";

  function summary(): AiSummary {
    return {
      dailyOverview: "概況",
      topPicks: [],
      enSummaries: [
        { url: thin.url, summaryJa: speculated },
        { url: titled.url, summaryJa: "レビュー対象の把握をしやすくする機能と考えられます。" },
        { url: rich.url, summaryJa: grounded },
      ],
      classifications: [
        { url: thin.url, genre: "misc", stars: 1 },
        { url: blank.url, genre: "misc", stars: 1 },
        { url: placeholder.url, genre: "misc", stars: 1 },
        { url: titled.url, genre: "web", stars: 1 },
        { url: rich.url, genre: "security", stars: 2 },
        { url: japanese.url, genre: "web", stars: 1 },
      ],
    };
  }

  function articleBlock(html: string, title: string): string {
    const start = html.indexOf(title);
    return html.slice(start, html.indexOf("</li>", start));
  }

  it("材料不足の英語記事は推測要約も本文情報なしも出さない", () => {
    const html = renderDigest(
      digest([thin, blank, placeholder, titled, rich, japanese], summary()),
      { archiveIndexHref: "archive/" },
    );
    const thinBlock = articleBlock(html, thin.title);
    const blankBlock = articleBlock(html, blank.title);
    const placeholderBlock = articleBlock(html, placeholder.title);
    const titledBlock = articleBlock(html, titled.title);
    const richBlock = articleBlock(html, rich.title);
    const japaneseBlock = articleBlock(html, japanese.title);

    expect(thinBlock).toContain(thin.title);
    expect(thinBlock).toContain("Hacker News");
    expect(thinBlock).toContain("▲ 409");
    expect(thinBlock).toContain(
      '<a href="https://news.ycombinator.com/item?id=50458900">391 comments</a>',
    );
    expect(thinBlock).not.toContain("article-excerpt");
    expect(thinBlock).not.toContain("本文情報なし");
    expect(thinBlock).not.toContain("訳");
    expect(thinBlock).not.toContain(speculated);
    expect(blankBlock).not.toContain("article-excerpt");
    expect(placeholderBlock).not.toContain("article-excerpt");
    expect(placeholderBlock).not.toContain("本文情報なし");
    expect(titledBlock).toContain(
      `<p class="article-excerpt excerpt-clamp">${titled.excerpt}</p>`,
    );
    expect(titledBlock).not.toContain("本文情報なし");
    expect(titledBlock).not.toContain("機能と考えられます");
    expect(richBlock).toContain(
      `<p class="article-translation"><span class="badge badge-ja">訳</span>${grounded}</p>`,
    );
    expect(richBlock).toContain(`<p class="article-excerpt excerpt-clamp">${COLD_FRAME}</p>`);
    expect(richBlock).not.toContain("本文情報なし");
    expect(japaneseBlock).not.toContain("article-excerpt");
    expect(japaneseBlock).not.toContain("本文情報なし");
    expect(html).not.toContain("本文情報なし");
    expect(html).not.toMatch(/<p class="article-excerpt[^"]*">\s*<\/p>/);
    expect(html).toMatch(/\.article\s*\{[^}]*padding:\s*14px 2px/);
    expect(html).toContain("script-src 'sha256-");
  });

  it("今日の注目には本文情報なしの抜粋を足さない", () => {
    const html = renderDigest(
      digest([thin, rich], {
        ...summary(),
        topPicks: [{ url: thin.url, reason: "議論が盛り上がっているため" }],
      }),
      { archiveIndexHref: "archive/" },
    );
    const topPicks = html.slice(html.indexOf('class="top-picks"'), html.indexOf('class="feed genre'));
    expect(topPicks).toContain(thin.title);
    expect(topPicks).toContain("議論が盛り上がっているため");
    expect(topPicks).toContain("Hacker News");
    expect(topPicks).not.toContain("article-excerpt");
    expect(topPicks).not.toContain("本文情報なし");
    expect(html).toContain(grounded);
    expect(html).not.toContain(speculated);
    expect(html).not.toContain("本文情報なし");
  });

  it("AI 要約がない日は本文情報なしを足さない", () => {
    const html = renderDigest(digest([thin], null), { archiveIndexHref: "archive/" });
    expect(html).toContain(thin.title);
    expect(html).toContain("▲ 409");
    expect(html).not.toContain("本文情報なし");
    expect(html).not.toMatch(/<p class="article-excerpt/);
    expect(html).not.toContain("訳");
  });
});
