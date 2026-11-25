/**
 * 記事 URL からトラッキング用クエリだけを除く。
 * utm_ で始まる名前と、広告・SNS のクリック ID を落とす。
 * それ以外のクエリとフラグメントは残す。解釈できない文字列はそのまま返す。
 */
const CLICK_IDS = new Set([
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "gad_campaignid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "igsh",
  "ttclid",
  "twclid",
  "li_fat_id",
  "yclid",
  "srsltid",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "mkt_tok",
]);

function isTrackingParam(name: string): boolean {
  const key = name.toLowerCase();
  return key.startsWith("utm_") || CLICK_IDS.has(key);
}

export function stripTrackingParams(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  let removed = false;
  for (const key of [...url.searchParams.keys()]) {
    if (!isTrackingParam(key)) continue;
    url.searchParams.delete(key);
    removed = true;
  }
  if (!removed) return rawUrl;
  return url.href;
}
