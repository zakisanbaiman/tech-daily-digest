import type { AiSummary, Article, DigestData, FeedResult } from "./types.js";

export interface RenderOptions {
  /** アーカイブ一覧ページへの相対パス（index.html からは "archive/"、アーカイブ内コピーからは "./"） */
  archiveIndexHref: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function formatDateJa(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const weekday = WEEKDAYS_JA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}年${m}月${d}日（${weekday}）`;
}

function renderTopPicks(summary: AiSummary, articles: Article[]): string {
  if (summary.topPicks.length === 0) return "";
  const byUrl = new Map(articles.map((a) => [a.url, a]));
  const items = summary.topPicks
    .map((pick, i) => {
      const article = byUrl.get(pick.url);
      if (!article) return "";
      return `
      <li class="pick">
        <span class="pick-no">${String(i + 1).padStart(2, "0")}</span>
        <div class="pick-body">
          <a class="pick-title" href="${escapeHtml(article.url)}">${escapeHtml(article.title)}</a>
          <p class="pick-reason">${escapeHtml(pick.reason)}</p>
          <span class="pick-source">${escapeHtml(article.sourceNames.join(" × "))}</span>
        </div>
      </li>`;
    })
    .join("");
  return `
  <section class="top-picks">
    <h2 class="section-title">今日の注目</h2>
    <ol class="picks">${items}</ol>
  </section>`;
}

function renderArticle(article: Article, summaryJa: string | undefined): string {
  const badges: string[] = [];
  if (article.sources.length > 1) {
    badges.push(
      `<span class="badge badge-multi">${escapeHtml(article.sourceNames.join(" × "))}</span>`,
    );
  }
  const metaBits: string[] = [];
  if (article.meta.points !== undefined) {
    metaBits.push(`▲ ${article.meta.points}`);
  }
  if (article.meta.comments !== undefined) {
    const label = `${article.meta.comments} comments`;
    metaBits.push(
      article.meta.commentsUrl
        ? `<a href="${escapeHtml(article.meta.commentsUrl)}">${label}</a>`
        : label,
    );
  }
  const excerpt = article.excerpt
    ? `<p class="article-excerpt">${escapeHtml(article.excerpt)}</p>`
    : "";
  const translation = summaryJa
    ? `<p class="article-translation"><span class="badge badge-ja">訳</span>${escapeHtml(summaryJa)}</p>`
    : "";
  return `
    <li class="article">
      <a class="article-title" href="${escapeHtml(article.url)}">${escapeHtml(article.title)}</a>
      ${badges.join("")}
      ${metaBits.length > 0 ? `<span class="article-meta">${metaBits.join(" · ")}</span>` : ""}
      ${translation}
      ${excerpt}
    </li>`;
}

function renderFeedSection(
  result: FeedResult,
  dedupedUrls: Set<string>,
  summaries: Map<string, string>,
): string {
  const { feed } = result;
  if (result.error) {
    return `
  <section class="feed">
    <h2 class="section-title">${escapeHtml(feed.name)}</h2>
    <p class="feed-error">取得失敗: ${escapeHtml(result.error)}</p>
  </section>`;
  }
  const articles = result.articles.filter((a) => dedupedUrls.has(a.url));
  if (articles.length === 0) return "";
  const items = articles
    .map((a) => renderArticle(a, summaries.get(a.url)))
    .join("");
  return `
  <section class="feed">
    <h2 class="section-title">${escapeHtml(feed.name)}<span class="section-count">${articles.length}</span></h2>
    <ul class="articles">${items}</ul>
  </section>`;
}

export function renderDigest(data: DigestData, options: RenderOptions): string {
  const summaries = new Map(
    (data.aiSummary?.enSummaries ?? []).map((s) => [s.url, s.summaryJa]),
  );
  // 重複除去で統合された記事は「最初に載ったフィード」のセクションにだけ出す
  const firstOwner = new Map(
    data.articles.map((a) => [a.url, a.sources[0] ?? ""]),
  );
  const sections = data.feedResults
    .map((result) =>
      renderFeedSection(
        result,
        new Set(
          data.articles
            .filter((a) => firstOwner.get(a.url) === result.feed.id)
            .map((a) => a.url),
        ),
        summaries,
      ),
    )
    .join("");

  const overview = data.aiSummary?.dailyOverview
    ? `<p class="overview">${escapeHtml(data.aiSummary.dailyOverview)}</p>`
    : "";
  const topPicks = data.aiSummary
    ? renderTopPicks(data.aiSummary, data.articles)
    : "";
  const generatedJst = new Date(data.generatedAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour12: false,
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(data.date)} | Tech Daily Digest</title>
<style>
:root {
  --paper: #f6f1e7;
  --card: #fffdf7;
  --ink: #211d18;
  --muted: #75695a;
  --accent: #c23a28;
  --rule: #d9cfbd;
  --rule-strong: #211d18;
  --mincho: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", Georgia, serif;
  --gothic: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #1a1712;
    --card: #221f19;
    --ink: #eae2d3;
    --muted: #9c917d;
    --accent: #e2593f;
    --rule: #3b352a;
    --rule-strong: #eae2d3;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--gothic);
  font-size: 15px;
  line-height: 1.85;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration-color: color-mix(in srgb, var(--accent) 55%, transparent); text-underline-offset: 3px; }
a:hover { color: var(--accent); }
.sheet { max-width: 720px; margin: 0 auto; padding: 28px 20px 64px; }

header.masthead { text-align: center; padding: 18px 0 14px; border-bottom: 4px double var(--rule-strong); }
.masthead-date { font-family: var(--gothic); font-size: 12px; letter-spacing: .35em; color: var(--muted); text-transform: uppercase; }
.masthead h1 {
  margin: 6px 0 4px;
  font-family: var(--mincho);
  font-weight: 600;
  font-size: clamp(28px, 7vw, 40px);
  letter-spacing: .08em;
}
.masthead h1 .accent { color: var(--accent); }
.masthead-sub { font-size: 12px; color: var(--muted); letter-spacing: .18em; }

.overview {
  font-family: var(--mincho);
  font-size: 17px;
  line-height: 2.1;
  margin: 28px 2px 8px;
  padding-left: 14px;
  border-left: 3px solid var(--accent);
}

.section-title {
  font-family: var(--mincho);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: .12em;
  margin: 0 0 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--rule-strong);
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.section-count { font-family: var(--gothic); font-size: 11px; color: var(--muted); letter-spacing: .05em; }

section { margin-top: 40px; animation: rise .5s ease both; }
section:nth-of-type(1) { animation-delay: .05s; }
section:nth-of-type(2) { animation-delay: .12s; }
section:nth-of-type(3) { animation-delay: .19s; }
section:nth-of-type(4) { animation-delay: .26s; }
section:nth-of-type(5) { animation-delay: .33s; }
section:nth-of-type(6) { animation-delay: .40s; }
section:nth-of-type(7) { animation-delay: .47s; }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { section { animation: none; } }

.picks { list-style: none; margin: 0; padding: 0; }
.pick {
  display: flex;
  gap: 16px;
  padding: 18px 16px;
  margin-top: 14px;
  background: var(--card);
  border: 1px solid var(--rule);
  border-top: 3px solid var(--accent);
}
.pick-no {
  font-family: var(--mincho);
  font-size: 30px;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.pick-title { font-family: var(--mincho); font-size: 17px; font-weight: 600; line-height: 1.7; }
.pick-reason { margin: 6px 0 4px; color: var(--muted); font-size: 13.5px; }
.pick-source { font-size: 11px; color: var(--accent); letter-spacing: .1em; }

.articles { list-style: none; margin: 0; padding: 0; }
.article { padding: 14px 2px; border-bottom: 1px dotted var(--rule); }
.article-title { font-weight: 600; }
.article-meta { margin-left: 10px; font-size: 12px; color: var(--muted); white-space: nowrap; }
.article-excerpt { margin: 4px 0 0; font-size: 13px; color: var(--muted); line-height: 1.8; }
.article-translation { margin: 4px 0 0; font-size: 13.5px; line-height: 1.8; }
.badge {
  display: inline-block;
  margin-left: 8px;
  padding: 0 6px;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 10.5px;
  letter-spacing: .08em;
  vertical-align: 2px;
  border-radius: 2px;
}
.badge-ja { margin: 0 6px 0 0; vertical-align: 1px; }
.feed-error { color: var(--muted); font-size: 13px; }

footer {
  margin-top: 56px;
  padding-top: 14px;
  border-top: 4px double var(--rule-strong);
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: .06em;
}
</style>
</head>
<body>
<div class="sheet">
  <header class="masthead">
    <div class="masthead-date">${escapeHtml(formatDateJa(data.date))}</div>
    <h1>Tech Daily <span class="accent">Digest</span></h1>
    <div class="masthead-sub">毎朝の技術情報、一枚に。</div>
  </header>
  ${overview}
  ${topPicks}
  ${sections}
  <footer>
    <a href="${escapeHtml(options.archiveIndexHref)}">アーカイブ</a>
    <span>生成: ${escapeHtml(generatedJst)}</span>
  </footer>
</div>
</body>
</html>
`;
}

/** アーカイブ一覧ページ（日付リンクの単純なリスト） */
export function renderArchiveIndex(dates: string[]): string {
  const items = [...dates]
    .sort()
    .reverse()
    .map(
      (date) =>
        `<li><a href="${escapeHtml(date)}.html">${escapeHtml(formatDateJa(date))}</a></li>`,
    )
    .join("\n      ");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>アーカイブ | Tech Daily Digest</title>
<style>
:root { --paper: #f6f1e7; --ink: #211d18; --accent: #c23a28; --rule: #211d18; }
@media (prefers-color-scheme: dark) { :root { --paper: #1a1712; --ink: #eae2d3; --accent: #e2593f; --rule: #eae2d3; } }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif; line-height: 2; }
.sheet { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
h1 { font-family: "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif; letter-spacing: .1em; border-bottom: 4px double var(--rule); padding-bottom: 10px; }
a { color: inherit; text-underline-offset: 3px; }
a:hover { color: var(--accent); }
ul { list-style: none; padding: 0; }
</style>
</head>
<body>
<div class="sheet">
  <h1>アーカイブ</h1>
  <p><a href="../">← 今日のダイジェスト</a></p>
  <ul>
      ${items}
  </ul>
</div>
</body>
</html>
`;
}
