import { describe, expect, it } from "vitest";
import { assertSafeFeedXml, fetchAllFeeds, publicFetchMessage } from "../fetch.js";
import { SafeFetchError, safeFetchText, type AddressLookup } from "../safeFetch.js";

const lookup: AddressLookup = async (hostname) => {
  if (hostname === "good.example" || hostname === "also.example") return ["1.1.1.1"];
  throw new Error(`unexpected lookup ${hostname}`);
};

function options(
  fetchImpl: typeof fetch,
  extra: { maxBytes?: number; onOverflow?: "error" | "truncate"; timeoutMs?: number } = {},
) {
  return {
    timeoutMs: extra.timeoutMs ?? 1000,
    maxBytes: extra.maxBytes ?? 1000,
    userAgent: "test",
    onOverflow: extra.onOverflow ?? "error",
    lookup,
    fetchImpl,
  } as const;
}

describe("safeFetchText", () => {
  it("非公開アドレスには接続しない", async () => {
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response("nope");
    };
    await expect(
      safeFetchText("https://127.0.0.1/latest/meta-data", options(fetchImpl)),
    ).rejects.toMatchObject({ publicMessage: "URLが許可されていません" });
    await expect(safeFetchText("https://2130706433/", options(fetchImpl))).rejects.toBeInstanceOf(
      SafeFetchError,
    );
    await expect(safeFetchText("http://good.example/a", options(fetchImpl))).rejects.toMatchObject({
      publicMessage: "URLが許可されていません",
    });
    expect(called).toBe(false);
  });

  it("https のリダイレクト先を再検証し、非公開アドレスへは追わない", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const href = String(input);
      seen.push(href);
      if (href.startsWith("https://good.example/start")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://127.0.0.1/secret" },
        });
      }
      return new Response("should-not-fetch");
    };
    await expect(safeFetchText("https://good.example/start", options(fetchImpl))).rejects.toMatchObject(
      { publicMessage: "URLが許可されていません" },
    );
    expect(seen).toEqual(["https://good.example/start"]);
  });

  it("公開 https へのリダイレクトは追う", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const href = String(input);
      if (href === "https://good.example/a") {
        return new Response(null, {
          status: 302,
          headers: { location: "/b" },
        });
      }
      if (href === "https://good.example/b") return new Response("<rss>ok</rss>");
      throw new Error(`unexpected ${href}`);
    };
    await expect(safeFetchText("https://good.example/a", options(fetchImpl))).resolves.toBe(
      "<rss>ok</rss>",
    );
  });

  it("リダイレクトの上限を超えたら止める", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(null, { status: 302, headers: { location: "https://good.example/loop" } });
    await expect(safeFetchText("https://good.example/loop", options(fetchImpl))).rejects.toMatchObject(
      { publicMessage: "リダイレクトが多すぎます" },
    );
  });

  it("応答サイズの上限で失敗するか、指定どおり切り詰める", async () => {
    const body = "x".repeat(50);
    const fetchImpl: typeof fetch = async () => new Response(body);
    await expect(
      safeFetchText("https://good.example/big", options(fetchImpl, { maxBytes: 10 })),
    ).rejects.toMatchObject({ publicMessage: "応答が大きすぎます" });
    await expect(
      safeFetchText(
        "https://good.example/big",
        options(fetchImpl, { maxBytes: 10, onOverflow: "truncate" }),
      ),
    ).resolves.toHaveLength(10);
  });

  it("タイムアウトは公開メッセージにする", async () => {
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        const fail = () => {
          const error = new Error("timed out");
          error.name = "TimeoutError";
          reject(error);
        };
        const signal = init?.signal;
        if (!signal) {
          fail();
          return;
        }
        if (signal.aborted) fail();
        else signal.addEventListener("abort", fail, { once: true });
      });
    await expect(
      safeFetchText("https://good.example/slow", options(fetchImpl, { timeoutMs: 50 })),
    ).rejects.toMatchObject({ publicMessage: "タイムアウト" });
  });
});

describe("feed errors", () => {
  it("DTD はルート要素より前だけ拒否する", () => {
    expect(() => assertSafeFeedXml('<!DOCTYPE foo [<!ENTITY x "y">]><rss></rss>')).toThrow(
      SafeFetchError,
    );
    expect(() =>
      assertSafeFeedXml("<rss><channel><item><title>what is &lt;!DOCTYPE html&gt;</title></item></channel></rss>"),
    ).not.toThrow();
  });

  it("取得できないフィードの公開エラーに内部アドレスを出さない", async () => {
    const [result] = await fetchAllFeeds([
      {
        id: "bad",
        name: "bad",
        url: "https://127.0.0.1/feed.xml",
        lang: "ja",
        maxItems: 1,
      },
    ]);
    expect(result?.articles).toEqual([]);
    expect(result?.error).toBe("URLが許可されていません");
    expect(result?.error).not.toContain("127.0.0.1");
    expect(publicFetchMessage(new Error("nope"))).toBe("取得できませんでした");
  });
});
