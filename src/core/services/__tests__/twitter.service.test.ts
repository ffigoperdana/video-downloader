import {
  cleanTwitterUrl,
  isValidTwitterUrl,
} from "../twitter.service";

describe("cleanTwitterUrl", () => {
  it("normalizes x.com to twitter.com", () => {
    expect(cleanTwitterUrl("https://x.com/user/status/123456")).toBe(
      "https://twitter.com/user/status/123456",
    );
  });

  it("keeps twitter.com as-is", () => {
    expect(cleanTwitterUrl("https://twitter.com/user/status/123456")).toBe(
      "https://twitter.com/user/status/123456",
    );
  });

  it("strips www prefix", () => {
    expect(cleanTwitterUrl("https://www.x.com/user/status/123456")).toBe(
      "https://twitter.com/user/status/123456",
    );
  });

  it("returns non-twitter URLs unchanged", () => {
    const url = "https://youtube.com/watch?v=abc";
    expect(cleanTwitterUrl(url)).toBe(url);
  });

  it("returns invalid URLs unchanged", () => {
    expect(cleanTwitterUrl("not a url")).toBe("not a url");
  });
});

describe("isValidTwitterUrl", () => {
  it.each([
    "https://twitter.com/user/status/1234567890",
    "https://x.com/user/status/1234567890",
    "https://www.twitter.com/user/status/1234567890",
    "https://www.x.com/user/status/1234567890",
    "https://twitter.com/elonmusk/status/1234567890?s=20",
  ])("validates %s", (url) => {
    expect(isValidTwitterUrl(url)).toBe(true);
  });

  it.each([
    "https://twitter.com/user",
    "https://x.com/",
    "https://twitter.com/user/photo/1",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isValidTwitterUrl(url)).toBe(false);
  });
});
