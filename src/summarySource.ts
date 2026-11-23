import type { Article } from "./types.js";

/**
 * 英語記事の日本語要約に使える材料があるかを、モデルに頼らず決める。
 * 本文・抜粋がほとんど無い記事は、タイトルから内容を推測した「訳」を出さない。
 */

/** URL と Hacker News の定型メタデータを除いたあと、内容要約に必要な最小文字数 */
export const MIN_SUMMARY_SOURCE_CHARS = 40;

/** これより短いタイトルは、本文先頭との偶然の一致と区別しない */
const MIN_TITLE_PREFIX_CHARS = 12;

/**
 * URL、hnrss の定型（Article URL / Comments URL / Points / # Comments）、
 * GitHub の画面文言（別タブでのサインイン表示など）を除いた本文。
 * ラベルは値の有無・並び・空白にかかわらず除く。URL を先に消すとラベル同士が隣り合い、
 * 先行ラベルが区切りの空白まで消費すると「Comments URL:」だけ残る。
 * 要約できるかの判定と、ページに出す抜粋の組み立てで同じ規則を使う。
 */
export function summarySourceText(excerpt: string): string {
  let text = stripGithubChrome(excerpt.replace(/https?:\/\/\S+/gi, " "));
  let previous: string;
  do {
    previous = text;
    text = text
      .replace(/\b(?:article|comments)\s+url\s*:/gi, " ")
      .replace(/(?:^|\s)points\s*:\s*\d+/gi, " ")
      .replace(/(?:^|\s)#\s*comments\s*:\s*\d+/gi, " ")
      // 値が無く、直後が終わりか別の定型ラベルだけのとき。単語が続く "points:" は本文なので残す。
      // 空白なしで隣り合うラベルは 1 回では取り切れないので、消えるまで繰り返す。
      .replace(
        /(?:^|\s)(?:points\s*:|#\s*comments\s*:)(?=\s*(?:$|\b(?:article|comments)\s+url\s*:|points\s*:|#\s*comments\s*:))/gi,
        " ",
      );
  } while (text !== previous);
  return text
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * GitHub のリポジトリページ先頭にある、本文ではない UI。
 * 隠れているセッション警告と、その閉じるボタン。はてブなどがページ先頭の
 * テキストを抜粋にすると、これだけが残る。フィードに og:description は無く、
 * 除いたあとに本文が残らなければ空にし、既存の空抜粋の扱いに任せる。
 * 「skip to content」はページ先頭のスキップリンクなので、文頭か文末のときだけ除く。
 */
function stripGithubChrome(text: string): string {
  const stripped = text
    .replace(/you\s+signed\s+in\s+with\s+another\s+tab\s+or\s+window\.?/gi, " ")
    .replace(/you\s+signed\s+out\s+in\s+another\s+tab\s+or\s+window\.?/gi, " ")
    .replace(/you\s+switched\s+accounts\s+on\s+another\s+tab\s+or\s+window\.?/gi, " ")
    .replace(/reload\s+to\s+refresh\s+your\s+session\.?/gi, " ")
    .replace(/\bdismiss\s+alert\b\.?/gi, " ")
    .replace(
      /you\s+must\s+be\s+signed\s+in\s+to\s+(?:change\s+notification\s+settings|fork\s+a\s+repository|star\s+a\s+repository)\.?/gi,
      " ",
    );
  return stripped
    .replace(/(?:^|\s)skip\s+to\s+content\.?(?=\s*(?:$|[.!?]))/gi, " ")
    .replace(/^\s*skip\s+to\s+content\.?\s*/gi, "");
}

/**
 * 抜粋がタイトルそのもの（末尾の省略記号や括弧書きだけ）なら、本文は足されていない。
 * 比較用の文字列を返す。表示には使わない。
 */
function fold(text: string): string {
  return text.toLocaleLowerCase().replace(/[–—―−]/g, "-");
}

function proseBeyondTitle(prose: string, title: string): string {
  const proseKey = fold(prose);
  const titleKey = fold(summarySourceText(title));
  if (titleKey.length < MIN_TITLE_PREFIX_CHARS) return proseKey;
  if (proseKey === titleKey) return "";
  if (!proseKey.startsWith(titleKey)) return proseKey;
  const next = proseKey.charAt(titleKey.length);
  if (next && !/[\s.…。、,.:：\-–—(（]/.test(next)) return proseKey;
  return proseKey.slice(titleKey.length).replace(/^[\s.…。、,.:：\-–—()（）[\]「」『』]+/, "");
}

/** 本文・抜粋が、内容の要約を事実の範囲で書けるだけあるか */
export function hasSummarizableSource(excerpt: string, title = ""): boolean {
  return proseBeyondTitle(summarySourceText(excerpt), title).length >= MIN_SUMMARY_SOURCE_CHARS;
}

/** 実在し、材料が十分な記事の要約だけ残す。推測要約はここで落とす。 */
export function selectGroundedSummaries<T extends { url: string }>(
  articles: readonly Pick<Article, "url" | "title" | "excerpt">[],
  summaries: readonly T[],
): T[] {
  const byUrl = new Map(articles.map((article) => [article.url, article]));
  return summaries.filter((item) => {
    const article = byUrl.get(item.url);
    return article !== undefined && hasSummarizableSource(article.excerpt, article.title);
  });
}
