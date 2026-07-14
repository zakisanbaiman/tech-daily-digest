import type { Article, ArticleClassification, GenreId } from "./types.js";

export interface GenreDef {
  id: GenreId;
  label: string;
  /** 見出し・アイコン・★に使うジャンルカラー（ライト基準。ダークは CSS 側で明るく補正） */
  color: string;
  /** 24x24 stroke アイコンの SVG 内部要素 */
  icon: string;
}

export const GENRES: GenreDef[] = [
  {
    id: "ai-llm",
    label: "AI・LLM",
    color: "#c23a28",
    icon: '<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  },
  {
    id: "web",
    label: "Web開発",
    color: "#2f6b8f",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/>',
  },
  {
    id: "infra",
    label: "インフラ・クラウド",
    color: "#4a7a52",
    icon: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M7.5 7.5h.01M7.5 16.5h.01"/>',
  },
  {
    id: "security",
    label: "セキュリティ",
    color: "#a04a1f",
    icon: '<path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  },
  {
    id: "lang-tools",
    label: "言語・ツール",
    color: "#6b5a9e",
    icon: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
  },
  {
    id: "career",
    label: "キャリア・組織",
    color: "#b0813a",
    icon: '<circle cx="9" cy="8" r="3.5"/><path d="M3.5 20c.7-3.4 2.8-5.5 5.5-5.5s4.8 2.1 5.5 5.5M16 5.5a3.5 3.5 0 010 6.6M17.5 14.8c2 .7 3.4 2.5 4 5.2"/>',
  },
  {
    id: "science",
    label: "サイエンス",
    color: "#3f7f7a",
    icon: '<path d="M10 3h4M11 3v6l-5.5 9.2A2 2 0 007.2 21h9.6a2 2 0 001.7-2.8L13 9V3"/><path d="M8.5 15h7"/>',
  },
  {
    id: "misc",
    label: "その他",
    color: "#75695a",
    icon: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  },
];

export const GENRE_IDS = GENRES.map((genre) => genre.id);

export interface GenreGroup {
  genre: GenreDef;
  articles: (Article & { stars: number })[];
}

/**
 * 分類結果をもとに記事をジャンル別にまとめる。
 * 分類がない記事は「その他」★1 に落とす。
 * セクションは記事数の多い順（「その他」は常に最後）、記事は★の高い順。
 */
export function groupByGenre(
  articles: Article[],
  classifications: ArticleClassification[],
): GenreGroup[] {
  const byUrl = new Map(classifications.map((c) => [c.url, c]));
  const groups = new Map<GenreId, (Article & { stars: number })[]>();
  for (const article of articles) {
    const classification = byUrl.get(article.url);
    const genre: GenreId = classification?.genre ?? "misc";
    const stars = classification?.stars ?? 1;
    const list = groups.get(genre) ?? [];
    list.push({ ...article, stars });
    groups.set(genre, list);
  }
  return GENRES.filter((genre) => groups.has(genre.id))
    .map((genre) => ({
      genre,
      articles: groups
        .get(genre.id)!
        .sort((a, b) => b.stars - a.stars),
    }))
    .sort((a, b) => {
      if (a.genre.id === "misc") return 1;
      if (b.genre.id === "misc") return -1;
      return b.articles.length - a.articles.length;
    });
}
