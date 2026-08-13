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
      "好奇心旺盛な子犬の学習者「らぐ」。何にでも感動して前のめり。元気な語尾（〜だ！／〜しよう！）。",
    fallbackQuips: [
      "きょうも気になる記事がいっぱいだ！",
      "新しいこと、ひとつおぼえて帰ろう！",
      "けさの一杯といっしょにどうぞ！",
    ],
    svg: `
      <g ${LINE}>
        <ellipse cx="15" cy="42" rx="9" ry="17" transform="rotate(18 15 42)" fill="#FFE8C2"/>
        <ellipse cx="85" cy="42" rx="9" ry="17" transform="rotate(-18 85 42)" fill="#FFE8C2"/>
        <circle cx="50" cy="54" r="36" fill="#FFE8C2"/>
        <path d="M42 20 Q46 12 50 19 Q54 12 58 20" fill="none" stroke-width="2.2"/>
        <ellipse cx="9" cy="25" rx="6" ry="11" transform="rotate(-38 9 25)" fill="#FFE8C2"/>
        <ellipse cx="91" cy="25" rx="6" ry="11" transform="rotate(38 91 25)" fill="#FFE8C2"/>
        <ellipse cx="36" cy="48" rx="6" ry="7.5" fill="#4A4A4A" stroke="none"/>
        <ellipse cx="64" cy="48" rx="6" ry="7.5" fill="#4A4A4A" stroke="none"/>
        <circle cx="38.2" cy="45.2" r="2.3" fill="#FFFFFF" stroke="none"/>
        <circle cx="66.2" cy="45.2" r="2.3" fill="#FFFFFF" stroke="none"/>
        <circle cx="34.2" cy="51" r="1.1" fill="#FFFFFF" stroke="none"/>
        <circle cx="62.2" cy="51" r="1.1" fill="#FFFFFF" stroke="none"/>
        <ellipse cx="50" cy="58" rx="3" ry="2.2" fill="#4A4A4A" stroke="none"/>
        <path d="M44 63 Q47 67 50 63 Q53 67 56 63" fill="none" stroke-width="2.2"/>
        <ellipse cx="26" cy="59" rx="6" ry="4" fill="#FF9FB2" stroke="none" opacity="0.55"/>
        <ellipse cx="74" cy="59" rx="6" ry="4" fill="#FF9FB2" stroke="none" opacity="0.55"/>
      </g>`,
  },
  {
    id: "vectra",
    name: "べくとら",
    persona:
      "クールな猫の先輩エンジニア「べくとら」。ひとこと多いツッコミ気質。断定口調で、たまに毒。",
    fallbackQuips: [
      "流行に飛びつく前に、まず一次情報な",
      "今日の分、ざっと目を通しときな",
      "積ん読が増える音がするね",
    ],
    svg: `
      <g ${LINE}>
        <path d="M23 36 L28 11 L45 25 Z" fill="#D5C8F0"/>
        <path d="M77 36 L72 11 L55 25 Z" fill="#D5C8F0"/>
        <path d="M27 31 L29.5 17 L39 25 Z" fill="#FF9FB2" stroke="none" opacity="0.45"/>
        <path d="M73 31 L70.5 17 L61 25 Z" fill="#FF9FB2" stroke="none" opacity="0.45"/>
        <circle cx="50" cy="56" r="34" fill="#D5C8F0"/>
        <path d="M50 21 L50 7 M45 13 L50 7 L55 13" fill="none"/>
        <path d="M11 55 L21 53 M11 63 L21 61 M89 55 L79 53 M89 63 L79 61" fill="none" stroke-width="1.8"/>
        <ellipse cx="16" cy="74" rx="6" ry="11" transform="rotate(-22 16 74)" fill="#D5C8F0"/>
        <ellipse cx="84" cy="74" rx="6" ry="11" transform="rotate(22 84 74)" fill="#D5C8F0"/>
        <ellipse cx="36" cy="49" rx="5.5" ry="6.5" fill="#4A4A4A" stroke="none"/>
        <ellipse cx="64" cy="49" rx="5.5" ry="6.5" fill="#4A4A4A" stroke="none"/>
        <rect x="29.5" y="41" width="13" height="4" fill="#D5C8F0" stroke="none"/>
        <rect x="57.5" y="41" width="13" height="4" fill="#D5C8F0" stroke="none"/>
        <path d="M30 45 L42.5 45 M57.5 45 L70 45" fill="none" stroke-width="2.2"/>
        <path d="M42.5 45 L45.5 42.5 M57.5 45 L54.5 42.5" fill="none" stroke-width="2"/>
        <circle cx="38" cy="47.5" r="1.8" fill="#FFFFFF" stroke="none"/>
        <circle cx="66" cy="47.5" r="1.8" fill="#FFFFFF" stroke="none"/>
        <path d="M46 63 Q51 65.5 56 61.5" fill="none" stroke-width="2.2"/>
        <ellipse cx="27" cy="60" rx="6" ry="4" fill="#FF9FB2" stroke="none" opacity="0.4"/>
        <ellipse cx="73" cy="60" rx="6" ry="4" fill="#FF9FB2" stroke="none" opacity="0.4"/>
      </g>`,
  },
  {
    id: "chankun",
    name: "ちゃんくん",
    persona:
      "のんびりした豆腐のマスコット「ちゃんくん」。ゆるくて天然、ほんわか癒し系。ひらがな多め。",
    fallbackQuips: [
      "ぼくは今日もこまぎれに読むよ",
      "あさごはんは情報のかたまりだね",
      "ぜんぶ読めなくてもだいじょうぶだよ",
    ],
    svg: `
      <g ${LINE}>
        <rect x="16" y="24" width="68" height="64" rx="12" fill="#C8EFDF"/>
        <path d="M46 24 Q48 15 53 20 Q57 14 58 23" fill="none" stroke-width="2.2"/>
        <circle cx="36" cy="50" r="5.5" fill="#4A4A4A" stroke="none"/>
        <circle cx="64" cy="50" r="5.5" fill="#4A4A4A" stroke="none"/>
        <circle cx="37.8" cy="47.8" r="2.1" fill="#FFFFFF" stroke="none"/>
        <circle cx="65.8" cy="47.8" r="2.1" fill="#FFFFFF" stroke="none"/>
        <circle cx="33.8" cy="52.3" r="1" fill="#FFFFFF" stroke="none"/>
        <circle cx="61.8" cy="52.3" r="1" fill="#FFFFFF" stroke="none"/>
        <path d="M45 60 Q50 68 55 60 Z" fill="#FF9FB2" stroke-width="2.2"/>
        <ellipse cx="26" cy="62" rx="6" ry="4" fill="#FF9FB2" stroke="none" opacity="0.55"/>
        <ellipse cx="74" cy="62" rx="6" ry="4" fill="#FF9FB2" stroke="none" opacity="0.55"/>
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
