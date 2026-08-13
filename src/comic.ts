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
        <ellipse cx="9" cy="25" rx="6" ry="11" transform="rotate(-38 9 25)" fill="#FFE8C2"/>
        <ellipse cx="91" cy="25" rx="6" ry="11" transform="rotate(38 91 25)" fill="#FFE8C2"/>
        <ellipse cx="50" cy="57" rx="4" ry="3" fill="#4A4A4A" stroke="none"/>
        <circle cx="29" cy="62" r="5" fill="#FF9FB2" stroke="none" opacity="0.65"/>
        <circle cx="71" cy="62" r="5" fill="#FF9FB2" stroke="none" opacity="0.65"/>
        <path d="M31 49 Q37 42 43 49" fill="none"/>
        <path d="M57 49 Q63 42 69 49" fill="none"/>
        <path d="M42 63 Q50 75 58 63 Z" fill="#FF9FB2"/>
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
        <circle cx="50" cy="56" r="34" fill="#D5C8F0"/>
        <path d="M50 21 L50 7 M45 13 L50 7 L55 13" fill="none"/>
        <path d="M11 55 L21 53 M11 63 L21 61 M89 55 L79 53 M89 63 L79 61" fill="none" stroke-width="1.8"/>
        <ellipse cx="16" cy="74" rx="6" ry="11" transform="rotate(-22 16 74)" fill="#D5C8F0"/>
        <ellipse cx="84" cy="74" rx="6" ry="11" transform="rotate(22 84 74)" fill="#D5C8F0"/>
        <circle cx="30" cy="64" r="5" fill="#FF9FB2" stroke="none" opacity="0.5"/>
        <circle cx="70" cy="64" r="5" fill="#FF9FB2" stroke="none" opacity="0.5"/>
        <path d="M31 45 L43 45" fill="none"/>
        <path d="M57 45 L69 45" fill="none"/>
        <circle cx="37" cy="49" r="2.6" fill="#4A4A4A" stroke="none"/>
        <circle cx="63" cy="49" r="2.6" fill="#4A4A4A" stroke="none"/>
        <path d="M44 67 Q52 69 57 63" fill="none"/>
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
        <circle cx="30" cy="66" r="5" fill="#FF9FB2" stroke="none" opacity="0.6"/>
        <circle cx="70" cy="66" r="5" fill="#FF9FB2" stroke="none" opacity="0.6"/>
        <path d="M31 49 Q37 42 43 49" fill="none"/>
        <path d="M57 49 Q63 42 69 49" fill="none"/>
        <path d="M42 63 Q50 75 58 63 Z" fill="#FF9FB2"/>
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

/**
 * セリフを1行 maxPerLine 字で折り返す（SVG の text は自動折返しがないため）。
 * maxLines を超える分は捨てて末尾を「…」にする。
 */
export function wrapQuip(quip: string, maxPerLine = 22, maxLines = 3): string[] {
  const chars = [...quip.trim()];
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxPerLine) {
    lines.push(chars.slice(i, i + maxPerLine).join(""));
  }
  if (lines.length === 0) return [""];
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = [...(kept[maxLines - 1] ?? "")].slice(0, maxPerLine - 1).join("") + "…";
    return kept;
  }
  return lines;
}
