/**
 * 紙面冒頭の1コマ漫画。
 * キャラクターの造形はここに固定した SVG で描き、日ごとに変わるのはセリフだけ。
 * セリフは AI 要約（comicQuip）から来るが、無い日はキャラ固有のフォールバックを使う。
 */

export interface ComicCharacter {
  id: "ragu" | "vectra" | "chankun";
  name: string;
  /** AI にセリフを書かせるときの人格・口調の指定 */
  persona: string;
  /** AI 要約が無い日に日替わりで使うセリフ */
  fallbackQuips: string[];
  /** 100x100 座標系のキャラ絵（線 #4A4A4A / 塗りフラット） */
  svg: string;
}

const LINE = `stroke="#4A4A4A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;

export const COMIC_CAST: ComicCharacter[] = [
  {
    id: "ragu",
    name: "らぐ",
    persona:
      "好奇心旺盛で元気いっぱいな後輩の女の子「らぐ」。何にでも感動して前のめり。元気な語尾（〜だ！／〜しよう！）。",
    fallbackQuips: [
      "きょうも気になる記事がいっぱいだ！",
      "新しいこと、ひとつおぼえて帰ろう！",
      "けさの一杯といっしょにどうぞ！",
    ],
    svg: `
      <g ${LINE}>
        <ellipse cx="50" cy="52" rx="36" ry="34" fill="#FFD66E"/>
        <ellipse cx="50" cy="60" rx="29" ry="27" fill="#FFE8C2"/>
        <path d="M21 58 Q18 22 50 20 Q82 22 79 58 Q73 44 68 55 Q62 42 55 53 Q50 41 44 53 Q38 42 32 55 Q27 44 21 58 Z" fill="#FFD66E"/>
        <path d="M46 20 Q38 5 56 8 Q48 11 53 19" fill="#FFD66E" stroke-width="2.2"/>
        <path d="M28 54 Q36 49 44 54" stroke-width="3.2" fill="none"/>
        <path d="M56 54 Q64 49 72 54" stroke-width="3.2" fill="none"/>
        <ellipse cx="36" cy="62" rx="6" ry="7.5" fill="#8EC9FF" stroke="none"/>
        <ellipse cx="64" cy="62" rx="6" ry="7.5" fill="#8EC9FF" stroke="none"/>
        <ellipse cx="36" cy="62" rx="2.8" ry="3.8" fill="#4A4A4A" stroke="none"/>
        <ellipse cx="64" cy="62" rx="2.8" ry="3.8" fill="#4A4A4A" stroke="none"/>
        <circle cx="38.2" cy="59.2" r="2.2" fill="#FFFFFF" stroke="none"/>
        <circle cx="66.2" cy="59.2" r="2.2" fill="#FFFFFF" stroke="none"/>
        <circle cx="33.8" cy="65" r="1.1" fill="#FFFFFF" stroke="none"/>
        <circle cx="61.8" cy="65" r="1.1" fill="#FFFFFF" stroke="none"/>
        <path d="M44 74 Q50 82 56 74 Z" fill="#FF9FB2" stroke-width="2.2"/>
        <ellipse cx="25" cy="70" rx="5.5" ry="3.5" fill="#FF9FB2" stroke="none" opacity="0.55"/>
        <ellipse cx="75" cy="70" rx="5.5" ry="3.5" fill="#FF9FB2" stroke="none" opacity="0.55"/>
      </g>`,
  },
  {
    id: "vectra",
    name: "べくとら",
    persona:
      "クールな先輩エンジニアの女の子「べくとら」。ひとこと多いツッコミ気質。断定口調で、たまに毒。",
    fallbackQuips: [
      "流行に飛びつく前に、まず一次情報な",
      "今日の分、ざっと目を通しときな",
      "積ん読が増える音がするね",
    ],
    svg: `
      <g ${LINE}>
        <path d="M16 48 Q8 74 12 95 L26 95 Q29 72 25 50 Z" fill="#D5C8F0"/>
        <path d="M84 48 Q92 74 88 95 L74 95 Q71 72 75 50 Z" fill="#D5C8F0"/>
        <ellipse cx="50" cy="52" rx="36" ry="36" fill="#D5C8F0"/>
        <ellipse cx="50" cy="60" rx="29" ry="27" fill="#FFE8C2"/>
        <path d="M22 54 Q19 22 50 20 Q81 22 78 54 L72 47 Q66 55 60 47 Q55 55 50 47 Q45 55 40 47 Q34 55 28 47 Z" fill="#D5C8F0"/>
        <path d="M50 20 L50 6 M45 12 L50 6 L55 12" fill="none" stroke-width="2.2"/>
        <path d="M28 51 Q36 48 44 52" stroke-width="2" fill="none" opacity="0.7"/>
        <path d="M56 52 Q64 48 72 51" stroke-width="2" fill="none" opacity="0.7"/>
        <ellipse cx="36" cy="61" rx="5.8" ry="6.5" fill="#FFD66E" stroke="none"/>
        <ellipse cx="64" cy="61" rx="5.8" ry="6.5" fill="#FFD66E" stroke="none"/>
        <ellipse cx="36" cy="61" rx="2.6" ry="3.4" fill="#4A4A4A" stroke="none"/>
        <ellipse cx="64" cy="61" rx="2.6" ry="3.4" fill="#4A4A4A" stroke="none"/>
        <rect x="28" y="52" width="16" height="5" fill="#FFE8C2" stroke="none"/>
        <rect x="56" y="52" width="16" height="5" fill="#FFE8C2" stroke="none"/>
        <path d="M28 57 L44 57" stroke-width="3.2" fill="none"/>
        <path d="M56 57 L72 57" stroke-width="3.2" fill="none"/>
        <path d="M44 57 L47 54.5 M56 57 L53 54.5" stroke-width="2" fill="none"/>
        <circle cx="38" cy="60" r="1.8" fill="#FFFFFF" stroke="none"/>
        <circle cx="66" cy="60" r="1.8" fill="#FFFFFF" stroke="none"/>
        <path d="M46 75 Q51 77 55 73" fill="none" stroke-width="2.2"/>
        <ellipse cx="26" cy="70" rx="5.5" ry="3.5" fill="#FF9FB2" stroke="none" opacity="0.4"/>
        <ellipse cx="74" cy="70" rx="5.5" ry="3.5" fill="#FF9FB2" stroke="none" opacity="0.4"/>
      </g>`,
  },
  {
    id: "chankun",
    name: "ちゃんくん",
    persona:
      "ゆるふわ天然な女の子「ちゃんくん」。のんびり、ほんわか癒し系。ひらがな多めの一人称ボク。",
    fallbackQuips: [
      "ぼくは今日もこまぎれに読むよ",
      "あさごはんは情報のかたまりだね",
      "ぜんぶ読めなくてもだいじょうぶだよ",
    ],
    svg: `
      <g ${LINE}>
        <circle cx="15" cy="34" r="8" fill="#C8EFDF"/>
        <circle cx="85" cy="34" r="8" fill="#C8EFDF"/>
        <ellipse cx="50" cy="52" rx="36" ry="34" fill="#C8EFDF"/>
        <ellipse cx="50" cy="60" rx="29" ry="27" fill="#FFE8C2"/>
        <path d="M22 56 Q19 22 50 20 Q81 22 78 56 Q71 46 65 55 Q59 44 51 54 Q45 44 37 55 Q31 46 27 56 Q24 50 22 56 Z" fill="#C8EFDF"/>
        <path d="M29 57 Q36 53.5 43 58" stroke-width="3.2" fill="none"/>
        <path d="M57 58 Q64 53.5 71 57" stroke-width="3.2" fill="none"/>
        <ellipse cx="36" cy="63" rx="6" ry="7" fill="#FF9FB2" stroke="none"/>
        <ellipse cx="64" cy="63" rx="6" ry="7" fill="#FF9FB2" stroke="none"/>
        <ellipse cx="36" cy="63" rx="2.8" ry="3.6" fill="#4A4A4A" stroke="none"/>
        <ellipse cx="64" cy="63" rx="2.8" ry="3.6" fill="#4A4A4A" stroke="none"/>
        <circle cx="38.2" cy="60.4" r="2.2" fill="#FFFFFF" stroke="none"/>
        <circle cx="66.2" cy="60.4" r="2.2" fill="#FFFFFF" stroke="none"/>
        <circle cx="33.8" cy="66" r="1.1" fill="#FFFFFF" stroke="none"/>
        <circle cx="61.8" cy="66" r="1.1" fill="#FFFFFF" stroke="none"/>
        <path d="M45 74 Q47.5 77 50 74 Q52.5 77 55 74" fill="none" stroke-width="2.2"/>
        <ellipse cx="25" cy="70" rx="5.5" ry="3.5" fill="#FF9FB2" stroke="none" opacity="0.55"/>
        <ellipse cx="75" cy="70" rx="5.5" ry="3.5" fill="#FF9FB2" stroke="none" opacity="0.55"/>
      </g>`,
  },
];

/** 日付 (YYYY-MM-DD) から通算日数を出す。日替わりローテーションの種 */
function dayNumber(isoDate: string): number {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 86_400_000);
}

/** その日の登場キャラ。日付から決まるので、同じ日付なら何度生成しても同じ */
export function pickCharacter(isoDate: string): ComicCharacter {
  const cast = COMIC_CAST[dayNumber(isoDate) % COMIC_CAST.length];
  if (!cast) throw new Error("COMIC_CAST is empty");
  return cast;
}

export function fallbackQuip(character: ComicCharacter, isoDate: string): string {
  const quips = character.fallbackQuips;
  return quips[dayNumber(isoDate) % quips.length] ?? "きょうもいい一日にしよう！";
}

/** 行頭に置けない文字（折返し時は前の行にぶら下げる） */
const KINSOKU = new Set([..."、。，．・：；！？…ーぁぃぅぇぉっゃゅょ」』）｝】!?,.)"]);

/**
 * セリフを1行 maxPerLine 字で折り返す（SVG の text は自動折返しがないため）。
 * 行頭禁則文字は前の行に最大2字までぶら下げる。
 * maxLines を超える分は捨てて末尾を「…」にする。
 */
export function wrapQuip(quip: string, maxPerLine = 22, maxLines = 3): string[] {
  const chars = [...quip.trim()];
  const lines: string[] = [];
  let line: string[] = [];
  for (const ch of chars) {
    const hangable = KINSOKU.has(ch) && line.length < maxPerLine + 2;
    if (line.length >= maxPerLine && !hangable) {
      lines.push(line.join(""));
      line = [];
    }
    line.push(ch);
  }
  if (line.length > 0) lines.push(line.join(""));
  if (lines.length === 0) return [""];
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = [...(kept[maxLines - 1] ?? "")].slice(0, maxPerLine - 1).join("") + "…";
    return kept;
  }
  return lines;
}
