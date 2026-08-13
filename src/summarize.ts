import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { ComicCharacter } from "./comic.js";
import type { AiSummary, Article } from "./types.js";

const MODEL = "gpt-5.6-luna";
const MAX_EXCERPT_FOR_PROMPT = 200;

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
  comicQuip: z
    .string()
    .describe(
      "紙面冒頭の1コマ漫画でマスコットが言うセリフ。その日の記事の中で目立つトピックを具体名入りで要約する。日本語45字以内、絵文字なし",
    ),
});

function buildPrompt(articles: Article[], speaker: ComicCharacter): string {
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
    `4. comicQuip: 紙面冒頭の1コマ漫画のセリフ。今日の記事一覧を要約するひとことを、次のキャラクターとして書く: ${speaker.persona} 必ずその日の記事にある具体的な話題（技術名・プロダクト名・出来事）を1つ以上入れ、読者が「今日はこういう日か」と分かるようにする。一般論だけのセリフは禁止。45字以内・絵文字なし・キャラの口調を厳守`,
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
export async function summarize(
  articles: Article[],
  speaker: ComicCharacter,
): Promise<AiSummary | null> {
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
        { role: "user", content: buildPrompt(articles, speaker) },
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

/** モデルが実在しないURLを返した場合に備え、記事一覧に存在するURLだけ残す */
function sanitize(summary: AiSummary, articles: Article[]): AiSummary {
  const known = new Set(articles.map((a) => a.url));
  return {
    dailyOverview: summary.dailyOverview,
    topPicks: summary.topPicks.filter((p) => known.has(p.url)).slice(0, 3),
    enSummaries: summary.enSummaries.filter((s) => known.has(s.url)),
    comicQuip: summary.comicQuip?.trim() || undefined,
  };
}
