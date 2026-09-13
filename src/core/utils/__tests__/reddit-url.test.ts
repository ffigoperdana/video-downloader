import {
  buildRedditDownloadFilename,
  cleanRedditUrl,
  getRedditPostId,
  getRedditPostJsonUrl,
  isValidRedditUrl,
} from "../reddit-url";

describe("Reddit URL helpers", () => {
  it.each([
    "https://www.reddit.com/r/VideoGuide/comments/1oc9pow/a_post_title/",
    "https://reddit.com/comments/1oc9pow/",
    "https://old.reddit.com/r/VideoGuide/comments/1oc9pow/a_post_title/",
    "https://www.reddit.com/gallery/1oc9pow",
    "https://redd.it/1oc9pow",
  ])("validates %s", (url) => {
    expect(isValidRedditUrl(url)).toBe(true);
    expect(getRedditPostId(url)).toBe("1oc9pow");
  });

  it.each([
    "https://www.reddit.com/r/VideoGuide/",
    "https://www.reddit.com/",
    "https://redd.it/",
    "https://example.com/comments/1oc9pow",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isValidRedditUrl(url)).toBe(false);
  });

  it("normalizes a redd.it link to a canonical post URL", () => {
    expect(cleanRedditUrl("https://redd.it/1oc9pow?utm_source=share")).toBe(
      "https://www.reddit.com/comments/1oc9pow",
    );
  });

  it("builds the public JSON endpoint from any accepted post form", () => {
    expect(
      getRedditPostJsonUrl(
        "https://www.reddit.com/r/VideoGuide/comments/1oc9pow/a_post_title/",
      ),
    ).toBe("https://www.reddit.com/comments/1oc9pow.json?raw_json=1");
  });

  it("uses post identity and media index in download names", () => {
    expect(
      buildRedditDownloadFilename(
        "https://reddit.com/r/test/comments/1oc9pow/title",
        {
          extension: "jpg",
          mediaType: "image",
          index: 1,
          username: "saveit_user",
          title: "A gallery image",
        },
      ),
    ).toBe("reddit-A-gallery-image-saveit_user-1oc9pow-image-2.jpg");
  });
});
