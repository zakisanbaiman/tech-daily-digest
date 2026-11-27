import type { Article } from "./types.js";

/**
 * タイトルが違う同一ニュースを1件にまとめる。
 *
 * URL 正規化のあと、今日の注目とジャンル欄は同じ記事配列を見るが、
 * 注目からの除外は URL の完全一致だけなので、別 URL の続報はジャンル欄に残る。
 * ここで代表1件に畳んでおけば、どちらにも重複は出ない。
 *
 * 偽陽性を避けるため、固有名詞の一致だけではまとめない。
 * 版番号・引用された製品名・出来事の種類の食い違いと、CVE 番号が片方にしか無い場合を先に除外し、
 * 同じ言語なら出来事が同じで内容語が2語以上（または内容語が3語以上）重なるときだけまとめる。
 * 日英で文言が対応しない場合は、両方の主題である固有名詞と、同じ種類の出来事が揃うときだけまとめる。
 */

const ANCHOR_DENY = new Set([
  "microsoft", "google", "amazon", "apple", "meta", "openai", "anthropic",
  "github", "gitlab", "aws", "azure", "cloudflare", "linux", "windows",
  "android", "chrome", "firefox", "oracle", "intel", "nvidia", "adobe",
  "mozilla", "cisco", "ibm",
  "security", "software", "server", "servers", "system", "systems",
  "backend", "update", "incident", "release", "official", "support",
  "community", "engineering", "research", "service", "services",
  "javascript", "typescript", "python", "docker", "kubernetes",
  "internet", "network", "computer", "digital", "online", "mobile",
  "database", "cloud", "guide", "introducing", "announcing", "announced",
  "january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december",
  "report", "reports", "statement", "manager", "management",
  "skill", "skills", "news", "blog", "world", "today", "daily",
]);

/** 製品の版・派生名。これ以外の語が後ろに付く引用は別製品とみなす。 */
const EDITION = new Set(["zero", "pro", "plus", "lite", "mini", "se", "x"]);

const CONTENT_STOP = new Set([
  ...ANCHOR_DENY,
  "a", "an", "the", "of", "on", "in", "for", "to", "and", "or", "with",
  "from", "by", "at", "as", "is", "are", "was", "be", "this", "that",
  "it", "its", "their", "your", "how", "why", "what", "new", "into",
  "over", "after", "about", "via", "not", "you", "we", "our", "but",
  "can", "all", "out", "now", "involving",
  "する", "した", "して", "される", "された", "という", "こと", "もの", "ため",
  "よう", "など", "その", "この", "これ", "それ", "だけ", "のみ", "ぶり",
  "として", "による", "により", "について", "における", "向け", "いる", "ある",
  "なる", "できる", "および", "または", "から", "まで", "より", "今日", "今回",
  "最新", "速報", "公式", "正式", "提供", "公開", "発表", "開始", "情報",
  "可能", "対応", "記事", "紹介", "解説", "入門", "方法", "完全", "機能",
  "サービス", "ユーザー", "顧客", "アカウント", "データ", "セキュリティ",
  "エージェント", "アップデート", "プレビュー", "実装", "問題", "影響",
  "確認", "必要", "まとめ", "比較", "理由", "背景", "今後", "現在", "時点",
  "同時", "版", "系", "年", "月", "日", "用", "新", "一部", "経由", "管理",
  "注意", "無事", "発売", "登場", "リリース",
]);

const EVENT_RULES: { id: string; pattern: RegExp }[] = [
  {
    id: "incident",
    pattern:
      /流出|漏洩|漏えい|情報漏|不正アクセス|インシデント|\bincident\b|\bbreach(?:ed)?\b|\bleak(?:ed|s)?\b|\bhacked\b/i,
  },
  {
    id: "vuln",
    pattern: /脆弱性|\bcve-\d{4}-\d+\b|\bvulnerability\b|ゼロデイ|\b0-day\b/i,
  },
  {
    id: "release",
    pattern:
      /発売|正式版|正式リリース|提供開始|一般提供|登場|\brelease[ds]?\b|\blaunch(?:ed|es)?\b/i,
  },
];

const segmenter = new Intl.Segmenter("ja", { granularity: "word" });

interface Profile {
  titleKey: string;
  quotes: string[];
  anchors: Map<string, Set<string>>;
  primary: string | null;
  content: Set<string>;
  events: Set<string>;
  script: "ja" | "en";
}

export function mergeSameStories(articles: Article[]): Article[] {
  const profiles = articles.map((article) => buildProfile(article.title));
  const parent = articles.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) {
      const next = parent[root];
      if (next === undefined) return root;
      root = next;
    }
    let cursor = index;
    while (cursor !== root) {
      const next = parent[cursor];
      parent[cursor] = root;
      if (next === undefined) break;
      cursor = next;
    }
    return root;
  };

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const left = profiles[i];
      const right = profiles[j];
      if (!left || !right || !sameStory(left, right)) continue;
      const leftRoot = find(i);
      const rightRoot = find(j);
      if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < articles.length; i++) {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(i);
    else groups.set(root, [i]);
  }

  const drop = new Set<number>();
  for (const group of groups.values()) {
    const representative = pickRepresentative(articles, group);
    if (representative === undefined) continue;
    for (const index of group) {
      if (index === representative) continue;
      const extra = articles[index];
      const target = articles[representative];
      if (!extra || !target) continue;
      absorb(target, extra);
      drop.add(index);
    }
  }
  return articles.filter((_, index) => !drop.has(index));
}

function pickRepresentative(articles: Article[], group: number[]): number | undefined {
  return group.reduce<number | undefined>((best, index) => {
    if (best === undefined) return index;
    const current = articles[index];
    const chosen = articles[best];
    if (!current || !chosen) return best;
    if (current.sources.length !== chosen.sources.length) {
      return current.sources.length > chosen.sources.length ? index : best;
    }
    const currentPoints = current.meta.points ?? -1;
    const chosenPoints = chosen.meta.points ?? -1;
    if (currentPoints !== chosenPoints) {
      return currentPoints > chosenPoints ? index : best;
    }
    return index < best ? index : best;
  }, undefined);
}

function absorb(target: Article, extra: Article): void {
  for (const [i, source] of extra.sources.entries()) {
    if (target.sources.includes(source)) continue;
    target.sources.push(source);
    target.sourceNames.push(extra.sourceNames[i] ?? source);
  }
  if (!target.excerpt && extra.excerpt) target.excerpt = extra.excerpt;
  target.meta = { ...extra.meta, ...target.meta };
}

function sameStory(a: Profile, b: Profile): boolean {
  if (a.titleKey.length >= 16 && a.titleKey === b.titleKey) return true;
  const shared = sharedKeys(a, b);
  if (shared.length === 0) return false;
  if (quotesConflict(a.quotes, b.quotes)) return false;
  // 片方だけが CVE 番号を持つ、または番号が違う場合は、同じ脆弱性とは限らない。
  if (cveConflict(a.anchors, b.anchors)) return false;
  if (shared.some((key) => versionsConflict(a.anchors.get(key), b.anchors.get(key)))) {
    return false;
  }
  if (eventsConflict(a.events, b.events)) return false;

  if (a.script !== b.script) {
    if (a.events.size === 0 || b.events.size === 0) return false;
    if (![...a.events].some((event) => b.events.has(event))) return false;
    if (!a.primary || !b.primary) return false;
    return shared.some(
      (key) => keysCompatible(key, a.primary ?? "") && keysCompatible(key, b.primary ?? ""),
    );
  }

  const overlap = [...a.content].filter((token) => b.content.has(token)).length;
  const sharedEvent = [...a.events].some((event) => b.events.has(event));
  return (sharedEvent && overlap >= 2) || overlap >= 3;
}

function sharedKeys(a: Profile, b: Profile): string[] {
  const keys: string[] = [];
  for (const key of a.anchors.keys()) {
    if (b.anchors.has(key)) keys.push(key);
  }
  return keys;
}

function quotesConflict(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  return !a.some((left) => b.some((right) => keysCompatible(left, right)));
}

function keysCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const left = a.split(" ");
  const right = b.split(" ");
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  if (shorter.length === 0 || shorter.length === longer.length) return false;
  if (!shorter.every((token, index) => longer[index] === token)) return false;
  if (!shorter.some((token) => token.length >= 6 && !ANCHOR_DENY.has(token))) return false;
  return longer.slice(shorter.length).every((token) => EDITION.has(token));
}

function cveIds(anchors: Map<string, Set<string>>): string[] {
  return [...anchors.keys()].filter((key) => /^cve-\d{4}-\d+$/.test(key));
}

function cveConflict(
  left: Map<string, Set<string>>,
  right: Map<string, Set<string>>,
): boolean {
  const leftIds = cveIds(left);
  const rightIds = cveIds(right);
  if (leftIds.length === 0 && rightIds.length === 0) return false;
  if (leftIds.length === 0 || rightIds.length === 0) return true;
  return !leftIds.some((id) => rightIds.includes(id));
}

function versionsConflict(
  left: Set<string> | undefined,
  right: Set<string> | undefined,
): boolean {
  if (!left || !right || left.size === 0 || right.size === 0) return false;
  const covered = (from: Set<string>, to: Set<string>) =>
    [...from].every((version) => [...to].some((other) => versionsCompatible(version, other)));
  return !(covered(left, right) && covered(right, left));
}

function versionsCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return longer.startsWith(`${shorter}.`);
}

function eventsConflict(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  for (const event of a) {
    if (b.has(event)) return false;
  }
  return true;
}

function buildProfile(rawTitle: string): Profile {
  const title = stripPublisher(normalize(rawTitle));
  const anchors = new Map<string, Set<string>>();
  for (const run of capitalizedRuns(title)) {
    addRun(anchors, run.tokens, run.version);
  }
  for (const match of title.matchAll(/\bcve-\d{4}-\d{4,7}\b/gi)) {
    addKey(anchors, match[0].toLowerCase(), null);
  }
  const quotes = productQuotes(title);
  const anchorTokens = new Set<string>();
  for (const key of anchors.keys()) {
    for (const token of key.split(" ")) anchorTokens.add(token);
  }
  return {
    titleKey: title.toLowerCase(),
    quotes,
    anchors,
    primary: primaryKey(anchors),
    content: contentTokens(title, anchorTokens),
    events: eventsOf(title),
    script: scriptOf(title),
  };
}

function normalize(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** 末尾の媒体名だけ外す。本文側の副題（ひらがなや読点を含むもの）は残す。 */
function stripPublisher(title: string): string {
  const piped = title.replace(/\s+[|｜]\s+[^|｜]+$/u, "").trim();
  const dash = piped.match(/^(.*)\s+[—–-]\s+([^-—–]+)$/u);
  const head = dash?.[1];
  const tail = dash?.[2];
  if (!head || !tail) return piped;
  const publisher =
    tail.length <= 40 && !/\p{Script=Hiragana}/u.test(tail) && !/[、。をがは]/.test(tail);
  return publisher ? head.trim() : piped;
}

function productQuotes(title: string): string[] {
  const quotes: string[] = [];
  for (const match of title.matchAll(/[「『]([^」』]{2,60})[」』]/g)) {
    const body = match[1];
    if (!body || !/[A-Za-z]/.test(body)) continue;
    const tokens = capitalizedRuns(body).flatMap((run) =>
      run.tokens.map((token) => token.toLowerCase()),
    );
    if (tokens.length === 0) continue;
    quotes.push(tokens.join(" "));
  }
  return quotes;
}

interface Run {
  tokens: string[];
  version: string | null;
}

function capitalizedRuns(title: string): Run[] {
  const matches = [...title.matchAll(/[A-Z][A-Za-z0-9.+#_-]*|\d+[A-Za-z][A-Za-z0-9.+#_-]*/g)];
  const runs: Run[] = [];
  let current: RegExpMatchArray[] = [];
  const flush = () => {
    const first = current[0];
    const last = current[current.length - 1];
    if (!first || !last || first.index === undefined || last.index === undefined) {
      current = [];
      return;
    }
    const end = last.index + last[0].length;
    const versionMatch = /^\s*v?(\d{1,3}(?:\.\d{1,3}){0,3})(?!\d|\.)/i.exec(title.slice(end));
    runs.push({
      tokens: current.map((match) => match[0]),
      version: versionMatch?.[1] ?? null,
    });
    current = [];
  };
  for (const match of matches) {
    if (match.index === undefined) continue;
    const prev = current[current.length - 1];
    if (!prev || prev.index === undefined) {
      current = [match];
      continue;
    }
    const gap = title.slice(prev.index + prev[0].length, match.index);
    if (/^[ \t]+$/.test(gap)) current.push(match);
    else {
      flush();
      current = [match];
    }
  }
  if (current.length > 0) flush();
  return runs;
}

function addRun(anchors: Map<string, Set<string>>, tokens: string[], version: string | null): void {
  const lowered = tokens.map((token) => token.toLowerCase());
  const distinctive = lowered.filter(
    (token) => !ANCHOR_DENY.has(token) && (token.length >= 6 || (/[a-z]/.test(token) && /\d/.test(token))),
  );
  const keys: string[] = [...distinctive];
  if (lowered.length >= 2) {
    const phrase = lowered.join(" ");
    const letters = phrase.replace(/[^a-z0-9]/g, "");
    const generic = lowered.every((token) => ANCHOR_DENY.has(token) || token.length <= 2);
    if (distinctive.length >= 1 || (letters.length >= 5 && !generic)) keys.push(phrase);
  }
  for (const key of keys) addKey(anchors, key, version);
}

function addKey(anchors: Map<string, Set<string>>, key: string, version: string | null): void {
  if (ANCHOR_DENY.has(key)) return;
  const versions = anchors.get(key) ?? new Set<string>();
  if (version) versions.add(version);
  anchors.set(key, versions);
}

function primaryKey(anchors: Map<string, Set<string>>): string | null {
  let best: string | null = null;
  let bestLength = 0;
  for (const key of anchors.keys()) {
    const length = key.replace(/ /g, "").length;
    if (length > bestLength) {
      best = key;
      bestLength = length;
    }
  }
  return best;
}

function contentTokens(title: string, anchorTokens: Set<string>): Set<string> {
  const tokens = new Set<string>();
  for (const part of segmenter.segment(title)) {
    if (!part.isWordLike) continue;
    const token = part.segment
      .normalize("NFKC")
      .toLowerCase()
      .replace(/['’‘]s$/g, "")
      .replace(/['’‘]/g, "");
    if (CONTENT_STOP.has(token) || anchorTokens.has(token) || /^\d+$/.test(token)) continue;
    if (/^[a-z0-9.+#_-]+$/i.test(token)) {
      if (token.length < 3) continue;
    } else if ([...token].length < 2) continue;
    // 「ファブシーン」が「ファ」「ブシ」に割れるような断片は、サイト名の一致に見えるので数えない。
    if (/^[\p{Script=Katakana}ー]+$/u.test(token) && [...token].length < 3) continue;
    tokens.add(token);
  }
  return tokens;
}

function eventsOf(title: string): Set<string> {
  const events = new Set<string>();
  for (const rule of EVENT_RULES) {
    if (rule.pattern.test(title)) events.add(rule.id);
  }
  return events;
}

/** ひらがながあれば日本語の見出し。英字の製品名が長くても日英混在にはしない。 */
function scriptOf(title: string): "ja" | "en" {
  if (/\p{Script=Hiragana}/u.test(title)) return "ja";
  const kanji = title.match(/\p{Script=Han}/gu)?.length ?? 0;
  const latin = title.match(/[A-Za-z]/g)?.length ?? 0;
  if (kanji === 0) return "en";
  return kanji >= latin ? "ja" : "en";
}
