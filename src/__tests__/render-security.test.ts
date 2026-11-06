import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildSite } from "../archive.js";
import { renderArchiveIndex, renderDigest } from "../render.js";
import { boundPlainText } from "../summarize.js";
import type { AiSummary, Article, DigestData } from "../types.js";

function article(url: string, title = "タイトル"): Article {
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

function digest(articles: Article[], aiSummary: AiSummary | null = null): DigestData {
  return {
    date: "2026-08-13",
    generatedAt: "2026-08-13T00:00:00.000Z",
    feedResults: [
      {
        feed: {
          id: "sample",
          name: "サンプル",
          url: "https://example.com/feed.xml",
          lang: "ja",
          maxItems: 10,
        },
        articles,
      },
    ],
    articles,
    aiSummary,
  };
}

describe("renderDigest", () => {
  it("通常の https リンクは残し、危険な URL はリンクにしない", () => {
    const html = renderDigest(
      digest([
        article("https://example.com/ok", "安全な記事"),
        article("javascript:alert(1)", "危険な記事"),
      ]),
      { archiveIndexHref: "archive/" },
    );
    expect(html).toContain('href="https://example.com/ok"');
    expect(html).toContain("安全な記事");
    expect(html).toContain("危険な記事");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onerror=");
  });

  it("非公開ホストの画像と危険なコメント URL を出さない", () => {
    const item = article("https://example.com/ok", "記事");
    item.meta = { comments: 2, commentsUrl: "javascript:alert(1)" };
    const summary: AiSummary = {
      dailyOverview: "概況",
      topPicks: [
        { url: "https://example.com/ok", reason: "理由", imageUrl: "https://127.0.0.1/meta.png" },
        { url: "https://example.com/ok", reason: "理由2", imageUrl: "http://cdn.example/a.png" },
      ],
      enSummaries: [],
      classifications: [],
    };
    const html = renderDigest(digest([item], summary), { archiveIndexHref: "./" });
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("http://cdn.example/a.png");
    expect(html).toContain("2 comments");
  });

  it("CSP のハッシュがインラインスクリプトと一致する", () => {
    const html = renderDigest(digest([article("https://example.com/ok")]), {
      archiveIndexHref: "archive/",
    });
    const script = html.match(/<script>([^<]*)<\/script>/)?.[1];
    const hash = html.match(/script-src 'sha256-([^']+)'/)?.[1];
    expect(script).toBeTruthy();
    expect(hash).toBe(createHash("sha256").update(script ?? "").digest("base64"));
    expect(html).toContain('name="referrer" content="no-referrer"');
  });

  it("アーカイブ一覧はスクリプトを許可しない", () => {
    const html = renderArchiveIndex(["2026-08-13"]);
    expect(html).toContain("script-src 'none'");
    expect(html).not.toContain("<script>");
    expect(html).toContain('href="2026-08-13.html"');
  });

  it("今日の注目に入った記事はジャンル欄に繰り返さない", () => {
    const featured = article("https://example.com/featured", "注目記事");
    const other = article("https://example.com/other", "通常記事");
    const summary: AiSummary = {
      dailyOverview: "概況",
      topPicks: [{ url: featured.url, reason: "必読だから" }],
      enSummaries: [],
      classifications: [
        { url: featured.url, genre: "security", stars: 3 },
        { url: other.url, genre: "security", stars: 2 },
      ],
    };
    const html = renderDigest(digest([featured, other], summary), {
      archiveIndexHref: "archive/",
    });
    const topPicks = html.slice(
      html.indexOf('class="top-picks"'),
      html.indexOf('class="feed genre'),
    );
    const genres = html.slice(html.indexOf('class="feed genre'), html.indexOf("<footer>"));

    expect(topPicks).toContain("注目記事");
    expect(topPicks).toContain("必読だから");
    expect(genres).toContain("通常記事");
    expect(genres).toContain("セキュリティ");
    expect(genres).not.toContain("注目記事");
    expect(genres).not.toContain("https://example.com/featured");
    expect(genres).toContain('<span class="section-count">1</span>');
  });

  it("注目記事だけになったジャンルは描画しない", () => {
    const featured = article("https://example.com/featured", "注目記事");
    const other = article("https://example.com/other", "通常記事");
    const summary: AiSummary = {
      dailyOverview: "概況",
      topPicks: [{ url: featured.url, reason: "必読だから" }],
      enSummaries: [],
      classifications: [
        { url: featured.url, genre: "security", stars: 3 },
        { url: other.url, genre: "web", stars: 1 },
      ],
    };
    const html = renderDigest(digest([featured, other], summary), {
      archiveIndexHref: "archive/",
    });
    const genres = html.slice(html.indexOf('class="feed genre'), html.indexOf("<footer>"));

    expect(html).toContain("今日の注目");
    expect(html).toContain("注目記事");
    expect(genres).toContain("通常記事");
    expect(genres).toContain("Web開発");
    expect(genres).not.toContain("セキュリティ");
    expect(genres).toContain('<span class="section-count">1</span>');
  });

  it("注目 URL が記事 URL と完全一致しない記事はジャンルに残す", () => {
    const item = article("https://example.com/story", "残す記事");
    const summary: AiSummary = {
      dailyOverview: "概況",
      topPicks: [{ url: "https://example.com/story/", reason: "末尾スラッシュ違い" }],
      enSummaries: [],
      classifications: [{ url: item.url, genre: "career", stars: 2 }],
    };
    const html = renderDigest(digest([item], summary), {
      archiveIndexHref: "archive/",
    });
    const genres = html.slice(html.indexOf('class="feed genre'), html.indexOf("<footer>"));

    expect(genres).toContain("残す記事");
    expect(genres).toContain("キャリア・組織");
    expect(html).not.toContain("末尾スラッシュ違い");
  });
});

describe("buildSite", () => {
  it("日付以外のパスではファイルを書かない", async () => {
    await expect(
      buildSite({
        date: "../evil",
        generatedAt: "2026-08-13T00:00:00.000Z",
        feedResults: [],
        articles: [],
        aiSummary: null,
      }),
    ).rejects.toThrow("invalid digest date");
  });
});

describe("boundPlainText", () => {
  it("制御文字を除いて長さを抑える", () => {
    expect(boundPlainText("a\u0000b\n c", 10)).toBe("a b c");
    expect(boundPlainText("あいうえお", 3)).toBe("あいう…");
  });
});
