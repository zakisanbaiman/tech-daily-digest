import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderArchiveIndex, renderDigest } from "./render.js";
import type { DigestData } from "./types.js";

const ARCHIVE_DIR = "archive";
const SITE_DIR = "dist-site";

/**
 * 当日分を archive/（git で蓄積）に書き、dist-site/ に公開サイト一式を組み立てる。
 * - archive/YYYY-MM-DD.html … 過去分の蓄積（CI が main に commit）
 * - dist-site/index.html    … 今日のダイジェスト
 * - dist-site/archive/      … 過去分のコピー + 一覧 index.html
 */
export async function buildSite(data: DigestData): Promise<void> {
  await mkdir(ARCHIVE_DIR, { recursive: true });
  await writeFile(
    join(ARCHIVE_DIR, `${data.date}.html`),
    renderDigest(data, { archiveIndexHref: "./" }),
  );

  await mkdir(join(SITE_DIR, ARCHIVE_DIR), { recursive: true });
  await writeFile(
    join(SITE_DIR, "index.html"),
    renderDigest(data, { archiveIndexHref: "archive/" }),
  );

  const archivedFiles = (await readdir(ARCHIVE_DIR)).filter((name) =>
    /^\d{4}-\d{2}-\d{2}\.html$/.test(name),
  );
  await Promise.all(
    archivedFiles.map((name) =>
      copyFile(join(ARCHIVE_DIR, name), join(SITE_DIR, ARCHIVE_DIR, name)),
    ),
  );
  const dates = archivedFiles.map((name) => name.replace(/\.html$/, ""));
  await writeFile(
    join(SITE_DIR, ARCHIVE_DIR, "index.html"),
    renderArchiveIndex(dates),
  );
}
