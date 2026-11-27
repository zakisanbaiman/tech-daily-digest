import { describe, expect, it } from "vitest";
import { dedupeArticles } from "../dedupe.js";
import type { Article, FeedConfig, FeedResult } from "../types.js";

function makeArticle(overrides: Partial<Article>): Article {
  return {
    title: "タイトル",
    url: "https://example.com/a",
    sources: ["hatena-it"],
    sourceNames: ["はてブ テクノロジー"],
    publishedAt: null,
    excerpt: "",
    lang: "ja",
    meta: {},
    ...overrides,
  };
}

function makeResult(articles: Article[]): FeedResult {
  const feed: FeedConfig = {
    id: "hatena-it",
    name: "はてブ テクノロジー",
    url: "https://b.hatena.ne.jp/hotentry/it.rss",
    lang: "ja",
    maxItems: 30,
  };
  return { feed, articles };
}

const PASSWORD_OFFICIAL = makeArticle({
  title:
    "Update on a security incident involving 1Password’s backend systems. | 1Password",
  url: "https://1password.com/blog/update-on-nov-2026-security-incident",
  sources: ["hatena-it", "hackernews"],
  sourceNames: ["はてブ テクノロジー", "Hacker News"],
  lang: "en",
  meta: { points: 312, comments: 180 },
  excerpt: "",
});

const PASSWORD_BIGGO = makeArticle({
  title:
    "1Password、従業員のGitHubアカウント経由で顧客の氏名とメールアドレスが流出したと発表 — BigGo ファイナンス",
  url: "https://finance.biggo.jp/news/86bd3431-ad2e-4b18-b885-4fb6393beb46",
  excerpt: "一部ユーザーの氏名とメールアドレスが流出した。",
});

const PASSWORD_IMPRESS = makeArticle({
  title:
    "パスワード管理「1Password」でデータ流出、一部顧客の氏名やメールアドレスなど／パスワード保管庫やその鍵は無事、招待・復旧メールを装ったフィッシングに注意",
  url: "https://forest.watch.impress.co.jp/docs/news/2159320.html",
});

const PASSWORD_PASSKEY = makeArticle({
  title: "1Password、パスキー対応を拡大し、複数端末でのログインを簡単にする",
  url: "https://example.com/1password-passkeys",
});

const DEFANG = makeArticle({
  title: "Defang Security Incident",
  url: "https://defang.io/blog/post/security-incident-november-2026/",
  sources: ["hackernews"],
  sourceNames: ["Hacker News"],
  lang: "en",
});

describe("同一ニュースのまとめ", () => {
  it("1Password のインシデントは1件にまとめ、別件は残す", () => {
    const unrelated = makeArticle({
      title: "地元の図書館で紙のカード目録を数字化した話",
      url: "https://example.com/library",
    });
    const deduped = dedupeArticles([
      makeResult([
        unrelated,
        PASSWORD_BIGGO,
        PASSWORD_OFFICIAL,
        PASSWORD_IMPRESS,
        PASSWORD_PASSKEY,
        DEFANG,
      ]),
    ]);

    expect(deduped.map((article) => article.url)).toEqual([
      unrelated.url,
      PASSWORD_OFFICIAL.url,
      PASSWORD_PASSKEY.url,
      DEFANG.url,
    ]);
    expect(deduped[1]?.title).toBe(PASSWORD_OFFICIAL.title);
    expect(deduped[1]?.sourceNames).toEqual(["はてブ テクノロジー", "Hacker News"]);
    expect(deduped[1]?.excerpt).toBe(PASSWORD_BIGGO.excerpt);
    expect(deduped[1]?.meta).toEqual({ points: 312, comments: 180 });
  });

  it("製品名が同じでも別ニュースはまとめない", () => {
    const postgres19 = makeArticle({
      title: "PostgreSQL 19正式リリース。ノンブロッキングなREPACKやオートスケールを追加",
      url: "https://example.com/pg19",
    });
    const postgres18 = makeArticle({
      title: "PostgreSQL 18正式リリース。ノンブロッキングなREPACKやオートスケールを追加",
      url: "https://example.com/pg18",
    });
    const vs148 = makeArticle({
      title: "VS Code 1.148 正式リリース。エージェント向けの Dev Container を強化",
      url: "https://example.com/vscode-1148",
    });
    const vs147 = makeArticle({
      title: "VS Code 1.147 正式リリース。エージェント向けの Dev Container を強化",
      url: "https://example.com/vscode-1147",
    });
    const horizonAzure = makeArticle({
      title:
        "［速報］マイクロソフト、PostgreSQL互換のミッションクリティカル向けデータベースサービス「Azure HorizonDB」正式リリース",
      url: "https://example.com/horizon-azure",
    });
    const horizonFabric = makeArticle({
      title:
        "［速報］PostgreSQL互換のサーバレスでOLTPとOLAP両対応を実現する「Microsoft Fabric HorizonDB」パブリックプレビュー",
      url: "https://example.com/horizon-fabric",
    });
    const http2shell = makeArticle({
      title:
        "「HTTP2Shell」CVE-2026-111497、Node.js・Python・Bun・Envoyに影響。Brotliの重大脆弱性",
      url: "https://example.com/http2shell",
    });
    const nodePatch = makeArticle({
      title: "【緊急】Node.jsの重大脆弱性に対応するセキュリティアップデートを安全に適用する方法",
      url: "https://example.com/node-patch",
    });
    const deduped = dedupeArticles([
      makeResult([
        PASSWORD_BIGGO,
        PASSWORD_PASSKEY,
        DEFANG,
        postgres19,
        postgres18,
        vs148,
        vs147,
        horizonAzure,
        horizonFabric,
        http2shell,
        nodePatch,
      ]),
    ]);

    expect(deduped.map((article) => article.url)).toEqual([
      PASSWORD_BIGGO.url,
      PASSWORD_PASSKEY.url,
      DEFANG.url,
      postgres19.url,
      postgres18.url,
      vs148.url,
      vs147.url,
      horizonAzure.url,
      horizonFabric.url,
      http2shell.url,
      nodePatch.url,
    ]);
  });

  it("INFOBAR ZERO の発売記事は1件にまとめる", () => {
    const impress = makeArticle({
      title: "auから「INFOBAR ZERO」、通話・SMS専用で復活 12月25日発売",
      url: "https://k-tai.watch.impress.co.jp/docs/news/2157313.html",
    });
    const cnet = makeArticle({
      title: "8年ぶり「INFOBAR」登場、3万2780円 通話とSMSのみ、ウェブ閲覧やSNSは非対応",
      url: "https://japan.cnet.com/article/35255050/",
      sources: ["publickey"],
      sourceNames: ["Publickey"],
    });
    const deduped = dedupeArticles([makeResult([impress, cnet])]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.url).toBe(impress.url);
    expect(deduped[0]?.sourceNames).toEqual(["はてブ テクノロジー", "Publickey"]);
  });
});
