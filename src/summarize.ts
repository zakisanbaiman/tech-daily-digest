import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { GENRES } from "./genre.js";
import type { AiSummary, Article, GenreId } from "./types.js";

const MODEL = "gpt-5.6-luna";
const MAX_EXCERPT_FOR_PROMPT = 200;

const GENRE_GUIDE = GENRES.map((g) => `${g.id}=${g.label}`).join(", ");

const aiSummarySchema = z.object({
  dailyOverview: z
    .string()
    .describe("その日の技術ニュース全体の傾向を日本語2〜3文でまとめた概況"),
  topPicks: z
    .array(
      z.object({
        url: z.string().describe("記事一覧に含まれる記事のURL（そのまま転記）"),
        reason: z.string().describe("注目すべき理由。日本語1〜2文"),
      }),
    )
    .describe("今日特に読むべき注目記事ちょうど3件"),
  enSummaries: z
    .array(
      z.object({
        url: z.string().describe("英語記事のURL（そのまま転記）"),
        summaryJa: z.string().describe("記事内容の日本語要約1〜2文"),
      }),
    )
    .describe("lang=en の全記事の日本語要約"),
  classifications: z
    .array(
      z.object({
        url: z.string().describe("記事のURL（そのまま転記）"),
        genre: z
          .enum(GENRES.map((g) => g.id) as [GenreId, ...GenreId[]])
          .describe(`ジャンル: ${GENRE_GUIDE}`),
        stars: z
          .number()
          .int()
          .describe("おすすめ度 1〜3。3=必読（全体の1割程度に絞る）、2=読む価値あり、1=流し見でよい"),
      }),
    )
    .describe("全記事のジャンル分類とおすすめ度"),
});

function buildPrompt(articles: Article[]): string {
  const list = articles.map((a) => ({
    url: a.url,
    title: a.title,
    source: a.sourceNames.join(" / "),
    lang: a.lang,
    ...(a.excerpt && { excerpt: a.excerpt.slice(0, MAX_EXCERPT_FOR_PROMPT) }),
    ...(a.meta.points !== undefined && { hnPoints: a.meta.points }),
  }));
  return [
    "以下は今日の技術系フィードから収集した記事一覧です。",
    "",
    "1. dailyOverview: 全体の傾向を日本語2〜3文で",
    "2. topPicks: エンジニアが今日読むべき注目記事をちょうど3件選び、理由を添える（複数ソースに載っている記事や議論が盛り上がっている記事を優先）",
    "3. enSummaries: lang が en の記事すべてについて、タイトルから推測できる内容の日本語要約を1〜2文で",
    "4. classifications: 全記事にジャンルとおすすめ度を付ける。ジャンルは内容が最も近いもの1つ、迷ったら misc。おすすめ度は 3=必読（全体の1割程度）、2=読む価値あり、1=流し見",
    "",
    "urlフィールドは一覧の値をそのまま転記すること。",
    "",
    JSON.stringify(list, null, 1),
  ].join("\n");
}

/**
 * 全記事を1回の呼び出しで要約する。
 * APIキー未設定・API失敗・スキーマ不一致はすべて null を返し、呼び出し側は要約なしで継続する。
 */
export async function summarize(articles: Article[]): Promise<AiSummary | null> {
  if (!process.env["OPENAI_API_KEY"]) {
    console.warn("[summarize] OPENAI_API_KEY not set; skipping AI summary");
    return null;
  }
  try {
    const client = new OpenAI();
    const response = await client.responses.parse({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "あなたは日本のソフトウェアエンジニア向けデイリーダイジェストの編集者です。",
        },
        { role: "user", content: buildPrompt(articles) },
      ],
      text: { format: zodTextFormat(aiSummarySchema, "digest_summary") },
    });
    const parsed = response.output_parsed;
    if (!parsed) {
      console.error("[summarize] empty structured output");
      return null;
    }
    return sanitize(parsed, articles);
  } catch (error) {
    console.error("[summarize] failed:", error);
    return null;
  }
}

/** モデルが実在しないURLや範囲外の値を返した場合に備えて整える */
function sanitize(summary: AiSummary, articles: Article[]): AiSummary {
  const known = new Set(articles.map((a) => a.url));
  const seen = new Set<string>();
  return {
    dailyOverview: summary.dailyOverview,
    topPicks: summary.topPicks.filter((p) => known.has(p.url)).slice(0, 3),
    enSummaries: summary.enSummaries.filter((s) => known.has(s.url)),
    classifications: summary.classifications
      .filter((c) => known.has(c.url) && !seen.has(c.url) && seen.add(c.url))
      .map((c) => ({ ...c, stars: Math.min(3, Math.max(1, c.stars)) })),
  };
}
