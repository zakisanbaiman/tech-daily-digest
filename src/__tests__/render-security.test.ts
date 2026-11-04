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
