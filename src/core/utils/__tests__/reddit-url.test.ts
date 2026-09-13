import {
  buildRedditDownloadFilename,
  cleanRedditUrl,
  getRedditDirectMediaId,
  getRedditPostId,
  getRedditPostJsonUrl,
  isRedditDirectMediaUrl,
  isRedditShareUrl,
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

  it("accepts Reddit's current share-link aliases for server-side resolution", () => {
    const url = "https://www.reddit.com/r/indowibu/s/V7GaQ3c8qu";

    expect(isValidRedditUrl(url)).toBe(true);
    expect(isRedditShareUrl(url)).toBe(true);
    expect(getRedditPostId(url)).toBeNull();
    expect(cleanRedditUrl(url)).toBe(url);
  });

  it("accepts an HTTPS packaged-media video as a direct-media fallback", () => {
    const url =
      "https://packaged-media.redd.it/83tghfh1b16h1/pb/m2-res_1280p.mp4?m=DASHPlaylist.mpd&v=1";

    expect(isValidRedditUrl(url)).toBe(true);
    expect(isRedditDirectMediaUrl(url)).toBe(true);
    expect(getRedditDirectMediaId(url)).toBe("83tghfh1b16h1");
    expect(cleanRedditUrl(url)).toBe(url);
  });

  it.each([
    "https://packaged-media.redd.it/83tghfh1b16h1/pb/poster.jpg",
    "http://packaged-media.redd.it/83tghfh1b16h1/pb/m2-res_1280p.mp4",
    "https://packaged-media.redd.it.evil.example/a.mp4",
  ])("rejects unsafe direct-media URL %s", (url) => {
    expect(isRedditDirectMediaUrl(url)).toBe(false);
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

  it("uses the direct-media identifier to avoid repeated direct-video filenames", () => {
    expect(
      buildRedditDownloadFilename(
        "https://packaged-media.redd.it/83tghfh1b16h1/pb/m2-res_1280p.mp4?m=DASHPlaylist.mpd",
        {
          extension: "mp4",
          mediaType: "video",
          title: "Reddit video",
        },
      ),
    ).toBe("reddit-83tghfh1b16h1-video-1.mp4");
  });
});
