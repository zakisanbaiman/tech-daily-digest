import { describe, expect, it } from "vitest";
import {
  isAllowedFeedUrl,
  isBlockedHostname,
  isBlockedIp,
  isSafeImageUrl,
  isSafeNavigationUrl,
} from "../urlSafety.js";

describe("isBlockedIp", () => {
  it("非公開・メタデータ・ループバックを拒否し、公開アドレスは許可する", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.5.1",
      "192.168.0.10",
      "169.254.169.254",
      "0.0.0.0",
      "100.100.100.200",
      "224.0.0.1",
      "255.255.255.255",
      "::1",
      "fc00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888", "::ffff:8.8.8.8"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("隣の公開レンジを巻き込まない", () => {
    expect(isBlockedIp("172.32.0.1")).toBe(false);
    expect(isBlockedIp("11.0.0.1")).toBe(false);
    expect(isBlockedIp("192.169.0.1")).toBe(false);
  });
});

describe("isBlockedHostname", () => {
  it("予約ホスト名と IP リテラルを拒否する", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("LOCALHOST.")).toBe(true);
    expect(isBlockedHostname("foo.localhost")).toBe(true);
    expect(isBlockedHostname("metadata.google.internal")).toBe(true);
    expect(isBlockedHostname("[::1]")).toBe(true);
    expect(isBlockedHostname("example.com")).toBe(false);
  });
});

describe("URL allowlists", () => {
  it("記事リンクは http(s) のみ", () => {
    expect(isSafeNavigationUrl("https://example.com/a")).toBe(true);
    expect(isSafeNavigationUrl("http://example.com/a")).toBe(true);
    expect(isSafeNavigationUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeNavigationUrl("data:text/html,hi")).toBe(false);
    expect(isSafeNavigationUrl("https://user:pass@example.com/")).toBe(false);
    expect(isSafeNavigationUrl("https://127.0.0.1/")).toBe(false);
    expect(isSafeNavigationUrl("https://2130706433/")).toBe(false);
  });

  it("画像とフィードは公開 https のみ", () => {
    expect(isSafeImageUrl("https://cdn.example/a.png")).toBe(true);
    expect(isSafeImageUrl("http://cdn.example/a.png")).toBe(false);
    expect(isSafeImageUrl("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedFeedUrl("https://example.com/feed.xml")).toBe(true);
    expect(isAllowedFeedUrl("http://example.com/feed.xml")).toBe(false);
    expect(isAllowedFeedUrl("https://example.com:8443/feed.xml")).toBe(false);
    expect(isAllowedFeedUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedFeedUrl("https://localhost/feed")).toBe(false);
  });
});
