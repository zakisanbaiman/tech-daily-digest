import { buildSite } from "./archive.js";
import { loadFeeds } from "./config.js";
import { dedupeArticles } from "./dedupe.js";
import { fetchAllFeeds } from "./fetch.js";
import { summarize } from "./summarize.js";
import type { DigestData } from "./types.js";

function todayInJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );
}

const feeds = await loadFeeds("feeds.json");
const feedResults = await fetchAllFeeds(feeds);

if (feedResults.every((result) => result.error)) {
  console.error("all feeds failed; aborting so the previous page stays up");
  process.exit(1);
}

const articles = dedupeArticles(feedResults);
const aiSummary = await summarize(articles);

const data: DigestData = {
  date: todayInJst(),
  generatedAt: new Date().toISOString(),
  feedResults,
  articles,
  aiSummary,
};

await buildSite(data);

const failed = feedResults.filter((result) => result.error).length;
console.log(
  `generated digest for ${data.date}: ${articles.length} articles` +
    ` (${failed} feed(s) failed, AI summary: ${aiSummary ? "yes" : "skipped"})`,
);
