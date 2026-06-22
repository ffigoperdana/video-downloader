import {
  cleanFacebookUrl,
  isValidFacebookUrl,
} from "@/core/services/facebook.service";

describe("cleanFacebookUrl", () => {
  it("normalizes facebook.com URLs", () => {
    expect(cleanFacebookUrl("https://www.facebook.com/watch/?v=123")).toBe(
      "https://www.facebook.com/watch/",
    );
  });

  it("preserves fb.watch short links", () => {
    expect(cleanFacebookUrl("https://fb.watch/abc123/")).toBe(
      "https://fb.watch/abc123/",
    );
  });

  it("returns non-facebook URLs unchanged", () => {
    const url = "https://youtube.com/watch?v=abc";
    expect(cleanFacebookUrl(url)).toBe(url);
  });

  it("returns invalid URLs unchanged", () => {
    expect(cleanFacebookUrl("not a url")).toBe("not a url");
  });
});

describe("isValidFacebookUrl", () => {
  it.each([
    "https://www.facebook.com/watch/?v=123456",
    "https://fb.watch/abc123/",
    "https://www.facebook.com/reel/123456",
    "https://m.facebook.com/watch/?v=123",
    "https://www.facebook.com/groups/123/posts/456",
  ])("validates %s", (url) => {
    expect(isValidFacebookUrl(url)).toBe(true);
  });

  it.each([
    "https://youtube.com/watch?v=123",
    "https://facebook.com",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isValidFacebookUrl(url)).toBe(false);
  });
});
