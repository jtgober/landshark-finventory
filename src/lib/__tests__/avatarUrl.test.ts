import { describe, expect, it } from "vitest";
import { isSafeAvatarUrl } from "../avatarUrl";

describe("isSafeAvatarUrl", () => {
  it("accepts ordinary https image hosts", () => {
    expect(isSafeAvatarUrl("https://dgalywyr863hs.cloudfront.net/pictures/athletes/1/medium.jpg")).toBe(true);
    expect(isSafeAvatarUrl("https://graph.facebook.com/123/picture")).toBe(true);
  });

  it("rejects non-https, missing and malformed values", () => {
    expect(isSafeAvatarUrl("http://example.com/a.jpg")).toBe(false);
    expect(isSafeAvatarUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeAvatarUrl("")).toBe(false);
    expect(isSafeAvatarUrl(null)).toBe(false);
    expect(isSafeAvatarUrl(undefined)).toBe(false);
    expect(isSafeAvatarUrl("not a url")).toBe(false);
    expect(isSafeAvatarUrl("avatar/athlete/medium.png")).toBe(false);
  });

  it("rejects localhost, internal names and IP addresses", () => {
    expect(isSafeAvatarUrl("https://localhost/a.png")).toBe(false);
    expect(isSafeAvatarUrl("https://app.localhost/a.png")).toBe(false);
    expect(isSafeAvatarUrl("https://printer.local/a.png")).toBe(false);
    expect(isSafeAvatarUrl("https://metadata.google.internal/a")).toBe(false);
    expect(isSafeAvatarUrl("https://127.0.0.1/a.png")).toBe(false);
    expect(isSafeAvatarUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafeAvatarUrl("https://[::1]/a.png")).toBe(false);
    expect(isSafeAvatarUrl("https://intranet/a.png")).toBe(false);
  });
});
