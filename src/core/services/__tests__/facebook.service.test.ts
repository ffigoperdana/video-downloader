import {
  cleanFacebookUrl,
  isValidFacebookUrl,
  resolveFacebookUrl,
} from "@/core/services/facebook.service";

describe("cleanFacebookUrl", () => {
  it("normalizes facebook.com URLs", () => {
    expect(cleanFacebookUrl("https://www.facebook.com/watch/?v=123")).toBe(
      "https://www.facebook.com/watch/?v=123",
    );
  });

  it("drops tracking parameters but keeps post identifiers", () => {
    expect(
      cleanFacebookUrl(
        "https://m.facebook.com/story.php?story_fbid=456&id=123&utm_source=test",
      ),
    ).toBe("https://www.facebook.com/story.php?story_fbid=456&id=123");
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

describe("resolveFacebookUrl", () => {
  afterEach(() => jest.restoreAllMocks());

  it("resolves a public share link to its canonical post", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "location"
            ? "https://www.facebook.com/SonyAlphaID/posts/pfbid123?rdid=tracking"
            : null,
      },
    } as Response);

    await expect(
      resolveFacebookUrl("https://www.facebook.com/share/p/1HJm22KFqR/"),
    ).resolves.toBe(
      "https://www.facebook.com/SonyAlphaID/posts/pfbid123",
    );
  });

  it("does not request direct permalinks", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    await expect(
      resolveFacebookUrl("https://www.facebook.com/user/posts/123"),
    ).resolves.toBe("https://www.facebook.com/user/posts/123");
    expect(fetchSpy).not.toHaveBeenCalled();
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
