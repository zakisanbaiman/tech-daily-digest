import { describe, expect, it } from "vitest";
import { GENRE_VISIBLE_COUNT, renderDigest } from "../render.js";
import type { AiSummary, Article, DigestData, GenreId } from "../types.js";

function article(url: string, title: string): Article {
  return {
    title,
    url,
    sources: ["sample"],
    sourceNames: ["サンプル"],
    publishedAt: null,
    excerpt: "",
    lang: "ja",
    meta: {},
  };
}

function digest(articles: Article[], aiSummary: AiSummary | null): DigestData {
  return {
    date: "2026-11-09",
    generatedAt: "2026-11-09T22:00:00.000Z",
    feedResults: [
      {
        feed: {
          id: "sample",
          name: "サンプル",
          url: "https://example.com/feed.xml",
          lang: "ja",
          maxItems: 30,
        },
        articles,
      },
    ],
    articles,
    aiSummary,
  };
}

function classified(
  count: number,
  genre: GenreId,
  titlePrefix: string,
  stars: number[] = [],
): { articles: Article[]; summary: AiSummary["classifications"] } {
  const articles = Array.from({ length: count }, (_, i) =>
    article(`https://example.com/${genre}/${i}`, `${titlePrefix}${i}`),
  );
  const summary = articles.map((item, i) => ({
    url: item.url,
    genre,
    stars: stars[i] ?? 1,
  }));
  return { articles, summary };
}

function genreSection(html: string, label: string): string {
  const marker = `>${label}<span class="section-count">`;
  const labelAt = html.indexOf(marker);
  expect(labelAt).toBeGreaterThanOrEqual(0);
  const start = html.lastIndexOf("<section", labelAt);
  const end = html.indexOf("</section>", labelAt);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end + "</section>".length);
}

function detailsInner(section: string): string {
  const start = section.indexOf("<details");
  const end = section.indexOf("</details>");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return section.slice(start, end);
}

describe("ジャンル欄の折りたたみ", () => {
  it("最初から見せる件数は6件", () => {
    expect(GENRE_VISIBLE_COUNT).toBe(6);
  });

  it("しきい値以下のジャンルは折りたたまない", () => {
    for (const count of [GENRE_VISIBLE_COUNT - 1, GENRE_VISIBLE_COUNT]) {
      const { articles, summary } = classified(count, "security", "記事");
      const html = renderDigest(
        digest(articles, {
          dailyOverview: "概況",
          topPicks: [],
          enSummaries: [],
          classifications: summary,
        }),
        { archiveIndexHref: "archive/" },
      );
      const section = genreSection(html, "セキュリティ");
      expect(section).not.toContain("<details");
      expect(section.match(/<ul class="articles">/g)).toHaveLength(1);
      expect(section).toContain(`<span class="section-count">${count}</span>`);
      for (const item of articles) expect(section).toContain(item.title);
    }
  });

  it("しきい値を1件超えると、超えた分だけが details に入る", () => {
    const count = GENRE_VISIBLE_COUNT + 1;
    const { articles, summary } = classified(count, "ai-llm", "記事");
    const html = renderDigest(
      digest(articles, {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [],
        classifications: summary,
      }),
      { archiveIndexHref: "archive/" },
    );
    const section = genreSection(html, "AI・LLM");
    const folded = articles.at(-1);
    expect(folded).toBeDefined();
    if (!folded) return;

    expect(section).toContain(`<span class="section-count">${count}</span>`);
    expect(section).toContain('<details class="more-articles">');
    expect(section).not.toContain("<details open");
    expect(section).toContain("<summary>残り1件を表示</summary>");
    expect(section.match(/<ul class="articles">/g)).toHaveLength(2);

    const before = section.slice(0, section.indexOf("<details"));
    const inside = detailsInner(section);
    for (const item of articles.slice(0, GENRE_VISIBLE_COUNT)) {
      expect(before).toContain(item.title);
      expect(inside).not.toContain(item.title);
    }
    expect(inside).toContain(folded.title);
    expect(before).not.toContain(folded.title);
    expect(section.indexOf('class="section-count"')).toBeLessThan(section.indexOf("<details"));
  });

  it("17件のジャンルは上位6件を表示し、残り11件を畳む", () => {
    const { articles, summary } = classified(17, "ai-llm", "AI記事");
    const html = renderDigest(
      digest(articles, {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [],
        classifications: summary,
      }),
      { archiveIndexHref: "archive/" },
    );
    const section = genreSection(html, "AI・LLM");
    const before = section.slice(0, section.indexOf("<details"));
    const inside = detailsInner(section);

    expect(section).toContain('<span class="section-count">17</span>');
    expect(section).toContain("<summary>残り11件を表示</summary>");
    for (const item of articles.slice(0, GENRE_VISIBLE_COUNT)) {
      expect(before).toContain(item.title);
    }
    for (const item of articles.slice(GENRE_VISIBLE_COUNT)) {
      expect(inside).toContain(item.title);
      expect(before).not.toContain(item.title);
    }
  });

  it("折りたたんでも★の多い順を崩さない", () => {
    const stars = [1, 1, 1, 1, 1, 3, 2];
    const { articles, summary } = classified(stars.length, "web", "記事", stars);
    const html = renderDigest(
      digest(articles, {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [],
        classifications: summary,
      }),
      { archiveIndexHref: "archive/" },
    );
    const section = genreSection(html, "Web開発");
    const before = section.slice(0, section.indexOf("<details"));
    const inside = detailsInner(section);
    const visibleTitles = ["記事5", "記事6", "記事0", "記事1", "記事2", "記事3"];

    let cursor = 0;
    for (const title of visibleTitles) {
      const at = before.indexOf(title, cursor);
      expect(at).toBeGreaterThanOrEqual(0);
      cursor = at + title.length;
      expect(inside).not.toContain(`>${title}<`);
    }
    expect(inside).toContain(">記事4<");
    expect(before).toContain("★★★");
    expect(inside).not.toContain("★★");
  });

  it("長いジャンルだけを畳み、しきい値以下のジャンルはそのまま出す", () => {
    const long = classified(GENRE_VISIBLE_COUNT + 2, "ai-llm", "長い");
    const exact = classified(GENRE_VISIBLE_COUNT, "security", "ちょうど");
    const short = classified(GENRE_VISIBLE_COUNT - 2, "infra", "短い");
    const articles = [...long.articles, ...exact.articles, ...short.articles];
    const html = renderDigest(
      digest(articles, {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [],
        classifications: [...long.summary, ...exact.summary, ...short.summary],
      }),
      { archiveIndexHref: "archive/" },
    );
    const longSection = genreSection(html, "AI・LLM");
    const exactSection = genreSection(html, "セキュリティ");
    const shortSection = genreSection(html, "インフラ・クラウド");

    expect(longSection).toContain("<summary>残り2件を表示</summary>");
    expect(longSection).toContain(
      `<span class="section-count">${GENRE_VISIBLE_COUNT + 2}</span>`,
    );
    expect(exactSection).not.toContain("<details");
    expect(exactSection).toContain(
      `<span class="section-count">${GENRE_VISIBLE_COUNT}</span>`,
    );
    expect(shortSection).not.toContain("<details");
    expect(shortSection).toContain(
      `<span class="section-count">${GENRE_VISIBLE_COUNT - 2}</span>`,
    );
    expect(html.match(/<details/g)).toHaveLength(1);
  });

  it("畳んだ記事のタイトルはエスケープされ、details もスクリプト方針も壊さない", () => {
    const count = GENRE_VISIBLE_COUNT + 1;
    const { articles, summary } = classified(count, "lang-tools", "記事");
    const folded = articles.at(-1);
    expect(folded).toBeDefined();
    if (!folded) return;
    folded.title = `</summary></details><script>alert(1)</script>`;
    const html = renderDigest(
      digest(articles, {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [],
        classifications: summary,
      }),
      { archiveIndexHref: "archive/" },
    );
    const section = genreSection(html, "言語・ツール");
    const inside = detailsInner(section);

    expect(section.match(/<details/g)).toHaveLength(1);
    expect(section.match(/<\/details>/g)).toHaveLength(1);
    expect(inside).toContain(
      "&lt;/summary&gt;&lt;/details&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(inside).not.toContain("<script>");
    expect(html.match(/<script[\s>]/g)).toHaveLength(1);
    expect(html).not.toMatch(/\son\w+=/i);
  });

  it("ジャンル分類がない媒体別レイアウトは折りたたまない", () => {
    const articles = Array.from({ length: GENRE_VISIBLE_COUNT + 3 }, (_, i) =>
      article(`https://example.com/feed/${i}`, `媒体${i}`),
    );
    const emptyClassifications: AiSummary = {
      dailyOverview: "概況",
      topPicks: [],
      enSummaries: [],
      classifications: [],
    };
    for (const aiSummary of [null, emptyClassifications]) {
      const html = renderDigest(digest(articles, aiSummary), {
        archiveIndexHref: "archive/",
      });
      expect(html).not.toContain("<details");
      expect(html).not.toContain("残り");
      expect(html).toContain(
        `<span class="section-count">${GENRE_VISIBLE_COUNT + 3}</span>`,
      );
    }
  });
});
