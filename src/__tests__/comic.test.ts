import { describe, expect, it } from "vitest";
import { COMIC_CAST, fallbackQuip, pickCharacter, wrapQuip } from "../comic.js";

describe("pickCharacter", () => {
  it("同じ日付なら常に同じキャラを返す", () => {
    expect(pickCharacter("2026-08-13").id).toBe(pickCharacter("2026-08-13").id);
  });

  it("連続する日でキャラが全員一巡する", () => {
    const ids = ["2026-08-13", "2026-08-14", "2026-08-15"].map(
      (d) => pickCharacter(d).id,
    );
    expect(new Set(ids).size).toBe(COMIC_CAST.length);
  });

  it("不正な日付でも例外にならずキャラを返す", () => {
    expect(COMIC_CAST).toContain(pickCharacter("not-a-date"));
  });
});

describe("fallbackQuip", () => {
  it("キャラの持ちネタから日付で決定的に選ぶ", () => {
    const c = pickCharacter("2026-08-13");
    const quip = fallbackQuip(c, "2026-08-13");
    expect(c.fallbackQuips).toContain(quip);
    expect(fallbackQuip(c, "2026-08-13")).toBe(quip);
  });
});

describe("wrapQuip", () => {
  it("1行に収まるセリフはそのまま1行", () => {
    expect(wrapQuip("こんにちは")).toEqual(["こんにちは"]);
  });

  it("maxPerLine ごとに折り返す", () => {
    expect(wrapQuip("あいうえおかきくけこ", 4)).toEqual([
      "あいうえ",
      "おかきく",
      "けこ",
    ]);
  });

  it("maxLines を超える分は末尾を…にして切り詰める", () => {
    const lines = wrapQuip("あいうえおかきくけこさしすせそ", 4, 2);
    expect(lines).toEqual(["あいうえ", "おかき…"]);
  });

  it("行頭禁則文字は前の行にぶら下げる", () => {
    expect(wrapQuip("あいうえ！かきくけ", 4)).toEqual(["あいうえ！", "かきくけ"]);
    expect(wrapQuip("あいうえ！？かきくけ", 4)).toEqual(["あいうえ！？", "かきくけ"]);
  });

  it("サロゲートペアを分断しない", () => {
    expect(wrapQuip("𠮷野家で𠮷野家で", 4)).toEqual(["𠮷野家で", "𠮷野家で"]);
  });

  it("空文字は空1行になる", () => {
    expect(wrapQuip("  ")).toEqual([""]);
  });

  it("ASCII の単語を途中で切らない（AI を A / I に分けない）", () => {
    const quip = "MAI Code 2とHorizonDB、AI時代の開発を走り抜けよう！";
    expect(wrapQuip(quip)).toEqual([
      "MAI Code 2とHorizonDB、",
      "AI時代の開発を走り抜けよう！",
    ]);
    // 見た目の改行だけで文字は落とさない（aria-label は行を連結したもの）
    expect(wrapQuip(quip).join("")).toBe(quip);
    expect(wrapQuip("これはAIだよ", 4)).toEqual(["これは", "AIだよ"]);
  });

  it("版番号のような ASCII の連続を分断しない", () => {
    expect(wrapQuip("バージョンは2.4です", 7)).toEqual(["バージョンは", "2.4です"]);
    expect(wrapQuip("版は1.0.0だ", 5)).toEqual(["版は", "1.0.0", "だ"]);
  });

  it("空白や CJK 境界で折り返す", () => {
    expect(wrapQuip("Use AI today", 8)).toEqual(["Use AI ", "today"]);
    expect(wrapQuip("あいABCD", 4)).toEqual(["あい", "ABCD"]);
  });

  it("日本語だけのセリフは文字数で折り返す", () => {
    expect(wrapQuip("きょうも気になる記事がいっぱいだ！", 10)).toEqual([
      "きょうも気になる記事",
      "がいっぱいだ！",
    ]);
    expect(wrapQuip("あいうえお、かきくけこさしすせそ", 8)).toEqual([
      "あいうえお、かき",
      "くけこさしすせそ",
    ]);
  });

  it("1行に収まらない ASCII の連続は従来どおり文字数で切る", () => {
    expect(wrapQuip("ABCDEFGHIJ", 4)).toEqual(["ABCD", "EFGH", "IJ"]);
    expect(wrapQuip("あいABCDEFGH", 4)).toEqual(["あいAB", "CDEF", "GH"]);
  });

  it("英数字の直後の禁則文字は行頭に出さない", () => {
    expect(wrapQuip("AI！だよ", 2)).toEqual(["AI！", "だよ"]);
  });
});
