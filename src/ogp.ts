import { safeFetchText } from "./safeFetch.js";
import type { AiSummary } from "./types.js";
import { isSafeImageUrl } from "./urlSafety.js";

const FETCH_TIMEOUT_MS = 10_000;
const HTML_SCAN_LIMIT = 200_000;
const HTML_MAX_BYTES = 512 * 1024;
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
        const html = await safeFetchText(pick.url, {
          timeoutMs: FETCH_TIMEOUT_MS,
          maxBytes: HTML_MAX_BYTES,
          userAgent: USER_AGENT,
          onOverflow: "truncate",
        });
        const image = extractOgImage(html);
        if (!image) return;
        const resolved = new URL(image, pick.url).href;
        if (isSafeImageUrl(resolved)) pick.imageUrl = resolved;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown";
        console.warn(
          `[ogp] thumbnail skipped: ${detail.replace(/[\r\n]/g, " ").slice(0, 200)}`,
        );
      }
    }),
  );
}
