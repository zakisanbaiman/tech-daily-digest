import type { AiSummary } from "./types.js";

const FETCH_TIMEOUT_MS = 10_000;
const HTML_SCAN_LIMIT = 200_000;
const USER_AGENT = "tech-daily-digest/0.1 (+https://github.com)";

export function extractOgImage(html: string): string | null {
  const head = html.slice(0, HTML_SCAN_LIMIT);
  const match =
    head.match(
      /<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i,
    ) ??
    head.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
    );
  return match?.[1] ?? null;
}

/**
 * 注目記事の og:image を取得して imageUrl に埋める。
 * 取得失敗・og:image なしはサムネイルなしのまま続行する。
 */
export async function attachThumbnails(summary: AiSummary): Promise<void> {
  await Promise.all(
    summary.topPicks.map(async (pick) => {
      try {
        const response = await fetch(pick.url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { "user-agent": USER_AGENT },
        });
        if (!response.ok) return;
        const image = extractOgImage(await response.text());
        if (!image) return;
        const resolved = new URL(image, pick.url).toString();
        if (resolved.startsWith("https://")) pick.imageUrl = resolved;
      } catch (error) {
        console.warn(`[ogp] thumbnail skipped for ${pick.url}:`, error);
      }
    }),
  );
}
