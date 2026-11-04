import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFeeds } from "../config.js";

async function loadRaw(body: unknown) {
  const dir = await mkdtemp(join(tmpdir(), "feeds-"));
  const path = join(dir, "feeds.json");
  await writeFile(path, JSON.stringify(body));
  return loadFeeds(path);
}

const base = {
  id: "example",
  name: "例",
  lang: "ja",
  maxItems: 3,
};

describe("loadFeeds", () => {
  it("同梱の feeds.json を読み込める", async () => {
    const feeds = await loadFeeds("feeds.json");
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds.every((feed) => feed.url.startsWith("https://"))).toBe(true);
  });

  it("http や非公開ホストのフィード URL を拒否する", async () => {
    await expect(loadRaw({ feeds: [{ ...base, url: "http://example.com/rss" }] })).rejects.toThrow();
    await expect(loadRaw({ feeds: [{ ...base, url: "https://127.0.0.1/rss" }] })).rejects.toThrow();
    await expect(loadRaw({ feeds: [{ ...base, url: "file:///tmp/feed.xml" }] })).rejects.toThrow();
  });
});
