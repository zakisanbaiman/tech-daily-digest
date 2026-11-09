import type { Article } from "./types.js";

/**
 * 英語記事の日本語要約に使える材料があるかを、モデルに頼らず決める。
 * 本文・抜粋がほとんど無い記事は、タイトルから内容を推測した「訳」を出さない。
 */

/** URL と Hacker News の定型メタデータを除いたあと、内容要約に必要な最小文字数 */
export const MIN_SUMMARY_SOURCE_CHARS = 40;

/** これより短いタイトルは、本文先頭との偶然の一致と区別しない */
const MIN_TITLE_PREFIX_CHARS = 12;

/** 要約の材料にならない URL と、hnrss の点数・コメント数などの定型 */
export function summarySourceText(excerpt: string): string {
  return excerpt
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/(?:^|\s)(?:article|comments)\s+url\s*:\s*/gi, " ")
    .replace(/(?:^|\s)points\s*:\s*\d+/gi, " ")
    .replace(/(?:^|\s)#\s*comments\s*:\s*\d+/gi, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
