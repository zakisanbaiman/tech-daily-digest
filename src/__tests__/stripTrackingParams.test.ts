import { describe, expect, it } from "vitest";
import { stripTrackingParams } from "../stripTrackingParams.js";

describe("stripTrackingParams", () => {
  it("utm_ をすべて除き、パラメータが無くなれば末尾の ? も残さない", () => {
    expect(
      stripTrackingParams(
        "https://qiita.com/minorun365/items/bd6091f2599a0f37326b?utm_campaign=popular_items&utm_medium=feed&utm_source=popular_items",
      ),
    ).toBe("https://qiita.com/minorun365/items/bd6091f2599a0f37326b");
  });

  it("utm とほかのパラメータが混在するときは、ほかを順序どおり残す", () => {
    expect(
      stripTrackingParams(
        "https://example.com/a?utm_source=x&id=1&utm_medium=feed&page=2",
      ),
    ).toBe("https://example.com/a?id=1&page=2");
  });

  it("フラグメントは残し、クエリが全部消えれば ? は付けない", () => {
    expect(
      stripTrackingParams("https://example.com/a?id=1&utm_source=x#section"),
    ).toBe("https://example.com/a?id=1#section");
    expect(stripTrackingParams("https://example.com/a?utm_source=x#section")).toBe(
      "https://example.com/a#section",
    );
  });

  it("fbclid や gclid などのクリック ID も除く", () => {
    expect(
      stripTrackingParams(
        "https://example.com/a?id=1&fbclid=abc&gclid=def&page=2",
      ),
    ).toBe("https://example.com/a?id=1&page=2");
    expect(stripTrackingParams("https://example.com/a?msclkid=abc")).toBe(
      "https://example.com/a",
    );
  });

  it("大文字の UTM_ も除き、名前が部分一致するだけのパラメータは残す", () => {
    expect(stripTrackingParams("https://example.com/a?ID=1&UTM_SOURCE=x")).toBe(
      "https://example.com/a?ID=1",
    );
    expect(
      stripTrackingParams("https://example.com/a?utm=keep&not_utm_source=1"),
    ).toBe("https://example.com/a?utm=keep&not_utm_source=1");
  });

  it("トラッキングが無い URL とフラグメント内の文字列はそのまま返す", () => {
    const plain = "https://news.ycombinator.com/item?id=1#comment";
    expect(stripTrackingParams(plain)).toBe(plain);
    expect(stripTrackingParams("https://example.com/a#fbclid=1")).toBe(
      "https://example.com/a#fbclid=1",
    );
  });

  it("URLとして解釈できない文字列はそのまま返す", () => {
    expect(stripTrackingParams("not a url")).toBe("not a url");
    expect(stripTrackingParams("")).toBe("");
    expect(stripTrackingParams("/p/1?utm_source=feed")).toBe("/p/1?utm_source=feed");
  });
});
