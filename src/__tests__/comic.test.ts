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
});
