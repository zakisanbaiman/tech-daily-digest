import { describe, expect, it } from "vitest";
import { GENRE_VISIBLE_COUNT, renderDigest } from "../render.js";
import type { AiSummary, Article, DigestData } from "../types.js";

function article(
  url: string,
  title: string,
  excerpt: string,
  lang: Article["lang"] = "ja",
): Article {
  return {
    title,
    url,
    sources: ["zenn"],
    sourceNames: ["Zenn"],
    publishedAt: null,
    excerpt,
    lang,
    meta: {},
  };
}

function digest(articles: Article[], aiSummary: AiSummary | null): DigestData {
  return {
    date: "2026-11-11",
    generatedAt: "2026-11-11T22:00:00.000Z",
    feedResults: [
      {
        feed: {
          id: "zenn",
          name: "Zenn",
          url: "https://zenn.dev/feed",
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

function styleOf(html: string): string {
  return html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
}

function rule(style: string, selector: string): string {
  const start = style.indexOf(selector);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const open = style.indexOf("{", start);
  const close = style.indexOf("}", open);
  return style.slice(start, close + 1);
}

/** 抜粋用ルールを除いたあとに line-clamp が残っていないこと */
function styleWithoutExcerptClamp(style: string): string {
  return style
    .replace(/\.excerpt-clamp\.excerpt-clamp-3\s*\{[^}]*\}/g, "")
    .replace(/\.excerpt-clamp\s*\{[^}]*\}/g, "");
}

const LONG = `${"あ".repeat(180)}LiteLLM Adaptive Router の学習シグナルと運用上の注意。${"い".repeat(160)}末尾マーカーEXCERPT_TAIL`;

describe("ジャンル欄の抜粋クランプ", () => {
  it("★★★ は3行、★★ と ★ は2行に畳み、全文は DOM に残す", () => {
    const star3 = article("https://example.com/star3", "必読", `${LONG}-3`);
    const star2 = article("https://example.com/star2", "おすすめ", `${LONG}-2`);
    const star1 = article("https://example.com/star1", "参考", `${LONG}-1`);
    const html = renderDigest(
      digest([star3, star2, star1], {
        dailyOverview: "今日の概況です。三行程度の導入で、ここは畳まない。",
        topPicks: [],
        enSummaries: [],
        classifications: [
          { url: star3.url, genre: "ai-llm", stars: 3 },
          { url: star2.url, genre: "ai-llm", stars: 2 },
          { url: star1.url, genre: "web", stars: 1 },
        ],
      }),
      { archiveIndexHref: "archive/" },
    );

    expect(html).toContain(
      `<p class="article-excerpt excerpt-clamp excerpt-clamp-3">${LONG}-3</p>`,
    );
    expect(html).toContain(`<p class="article-excerpt excerpt-clamp">${LONG}-2</p>`);
    expect(html).toContain(`<p class="article-excerpt excerpt-clamp">${LONG}-1</p>`);
    expect(html).toContain("EXCERPT_TAIL-3");
    expect(html).toContain("EXCERPT_TAIL-2");
    expect(html).toContain("EXCERPT_TAIL-1");

    const style = styleOf(html);
    const clamp = rule(style, ".excerpt-clamp {");
    expect(clamp).toContain("display: -webkit-box");
    expect(clamp).toContain("-webkit-box-orient: vertical");
    expect(clamp).toContain("-webkit-line-clamp: 2");
    expect(clamp).toContain("line-clamp: 2");
    expect(clamp).toContain("overflow: hidden");
    const clamp3 = rule(style, ".excerpt-clamp.excerpt-clamp-3");
    expect(clamp3).toContain("-webkit-line-clamp: 3");
    expect(clamp3).toContain("line-clamp: 3");
    expect(styleWithoutExcerptClamp(style)).not.toMatch(/line-clamp|-webkit-box/);
  });

  it("今日の注目と日次概況はクランプしない", () => {
    const featured = article("https://example.com/featured", "注目記事", `${LONG}-featured`);
    const other = article("https://example.com/other", "通常記事", `${LONG}-other`);
    const overview = `概況の全文です。${"う".repeat(240)}OVERVIEW_TAIL`;
    const reason = `注目理由の全文です。${"え".repeat(240)}PICK_TAIL`;
    const html = renderDigest(
      digest([featured, other], {
        dailyOverview: overview,
        topPicks: [{ url: featured.url, reason }],
        enSummaries: [],
        classifications: [
          { url: featured.url, genre: "ai-llm", stars: 3 },
          { url: other.url, genre: "ai-llm", stars: 3 },
        ],
      }),
      { archiveIndexHref: "archive/" },
    );

    expect(html).toContain(`<p class="overview">${overview}</p>`);
    expect(html).toContain(`<p class="pick-reason">${reason}</p>`);
    expect(html).not.toMatch(/class="overview[^"]*excerpt-clamp/);
    expect(html).not.toMatch(/class="pick-reason[^"]*excerpt-clamp/);
    expect(html).toContain("OVERVIEW_TAIL");
    expect(html).toContain("PICK_TAIL");

    const topPicks = html.slice(html.indexOf('class="top-picks"'), html.indexOf('class="feed genre'));
    expect(topPicks).not.toContain("excerpt-clamp");
    expect(topPicks).not.toContain("line-clamp");
    expect(topPicks).toContain(reason);

    const style = styleOf(html);
    expect(rule(style, ".overview {")).not.toContain("line-clamp");
    expect(rule(style, ".pick-reason {")).not.toContain("line-clamp");
    expect(html).toContain(
      `<p class="article-excerpt excerpt-clamp excerpt-clamp-3">${LONG}-other</p>`,
    );
    expect(html).not.toContain(`${LONG}-featured`);
  });

  it("折りたたんだジャンルの続きにも同じクランプが付き、details は増えない", () => {
    const articles = Array.from({ length: GENRE_VISIBLE_COUNT + 2 }, (_, i) =>
      article(
        `https://example.com/folded/${i}`,
        `記事${i}`,
        i === GENRE_VISIBLE_COUNT + 1 ? `${LONG}-folded` : `短い抜粋${i}`,
      ),
    );
    const html = renderDigest(
      digest(articles, {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [],
        classifications: articles.map((item, i) => ({
          url: item.url,
          genre: "ai-llm" as const,
          stars: i === 0 ? 3 : i === 1 ? 2 : 1,
        })),
      }),
      { archiveIndexHref: "archive/" },
    );

    const detailsAt = html.indexOf("<details");
    expect(detailsAt).toBeGreaterThanOrEqual(0);
    const folded = html.slice(detailsAt, html.indexOf("</details>", detailsAt));
    expect(html.match(/<details/g)).toHaveLength(1);
    expect(folded).toContain(
      `<p class="article-excerpt excerpt-clamp">${LONG}-folded</p>`,
    );
    expect(folded).toContain("EXCERPT_TAIL-folded");
    expect(folded).not.toContain("excerpt-clamp-3");
    expect(html).toContain(
      '<p class="article-excerpt excerpt-clamp excerpt-clamp-3">短い抜粋0</p>',
    );
    expect(html).toContain('<p class="article-excerpt excerpt-clamp">短い抜粋1</p>');
  });

  it("媒体別フォールバックと英語要約、本文情報なしはクランプしない", () => {
    const feedItem = article("https://example.com/feed", "媒体記事", `${LONG}-feed`);
    const fallback = renderDigest(
      digest([feedItem], {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [],
        classifications: [],
      }),
      { archiveIndexHref: "archive/" },
    );
    expect(fallback).toContain(`<p class="article-excerpt">${LONG}-feed</p>`);
    expect(fallback).not.toMatch(/<p class="article-excerpt excerpt-clamp/);

    const english = article(
      "https://example.com/en",
      "English post",
      "Browsers natively handle a lot of what used to take many lines of JavaScript and dependencies.",
      "en",
    );
    const thin = article("https://example.com/thin", "Thin post", "", "en");
    const summaryJa = "ブラウザー標準機能で、以前は大量のJavaScriptが必要だった処理を置き換えられると説明しています。";
    const html = renderDigest(
      digest([english, thin], {
        dailyOverview: "概況",
        topPicks: [],
        enSummaries: [{ url: english.url, summaryJa }],
        classifications: [
          { url: english.url, genre: "web", stars: 2 },
          { url: thin.url, genre: "web", stars: 1 },
        ],
      }),
      { archiveIndexHref: "archive/" },
    );
    expect(html).toContain(`<p class="article-translation"><span class="badge badge-ja">訳</span>${summaryJa}</p>`);
    expect(html).not.toMatch(/class="article-translation[^"]*excerpt-clamp/);
    expect(html).toContain('<p class="article-excerpt">本文情報なし</p>');
    expect(html).not.toMatch(/class="article-excerpt excerpt-clamp[^"]*">本文情報なし/);
    expect(html).toContain("script-src 'sha256-");
    expect(html).not.toContain("script-src 'unsafe-inline'");
    expect(html).not.toMatch(/\son\w+=/i);
  });
});
