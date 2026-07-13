export interface FeedConfig {
  id: string;
  name: string;
  url: string;
  lang: "ja" | "en";
  maxItems: number;
}

export interface Article {
  title: string;
  url: string;
  /** 掲載元フィードID。重複除去で複数フィードに載った記事は統合される */
  sources: string[];
  sourceNames: string[];
  publishedAt: string | null;
  excerpt: string;
  lang: "ja" | "en";
  meta: {
    points?: number;
    comments?: number;
    commentsUrl?: string;
  };
}

export interface FeedResult {
  feed: FeedConfig;
  articles: Article[];
  error?: string;
}

export interface AiSummary {
  dailyOverview: string;
  topPicks: { url: string; reason: string }[];
  enSummaries: { url: string; summaryJa: string }[];
}

export interface DigestData {
  /** JST の日付 (YYYY-MM-DD) */
  date: string;
  generatedAt: string;
  feedResults: FeedResult[];
  articles: Article[];
  aiSummary: AiSummary | null;
}
