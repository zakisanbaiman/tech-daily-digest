import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { FeedConfig } from "./types.js";
import { isAllowedFeedUrl } from "./urlSafety.js";

const feedConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().refine(isAllowedFeedUrl, {
    message: "feed URL must be a public https URL on port 443",
  }),
  lang: z.enum(["ja", "en"]),
  maxItems: z.number().int().positive(),
});

const feedsFileSchema = z.object({
  feeds: z.array(feedConfigSchema).min(1),
});

export async function loadFeeds(path: string): Promise<FeedConfig[]> {
  const raw = await readFile(path, "utf-8");
  const parsed = feedsFileSchema.parse(JSON.parse(raw));
  const ids = new Set<string>();
  for (const feed of parsed.feeds) {
    if (ids.has(feed.id)) {
      throw new Error(`feeds.json: duplicate feed id "${feed.id}"`);
    }
    ids.add(feed.id);
  }
  return parsed.feeds;
}
