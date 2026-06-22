import {
  isValidYoutubeUrl,
  isValidTikTokUrl,
  isValidInstagramUrl,
  isValidFacebookUrl,
  isValidTwitterUrl,
  isValidThreadsUrl,
  isPlatformUrl,
} from "../url-validators";

describe("isValidYoutubeUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ])("validates %s", (url) => {
    expect(isValidYoutubeUrl(url)).toBe(true);
  });

  it.each([
    "https://vimeo.com/123456",
    "not a url",
    "https://youtube.com",
    "https://youtube.com/watch",
    "https://youtu.be/",
  ])("rejects %s", (url) => {
    expect(isValidYoutubeUrl(url)).toBe(false);
  });
});

describe("isValidTikTokUrl", () => {
  it.each([
    "https://www.tiktok.com/@user/video/1234567890",
    "https://www.tiktok.com/@user/photo/1234567890",
    "https://vm.tiktok.com/AbCdEf/",
    "https://vt.tiktok.com/AbCdEf/",
    "https://www.tiktok.com/@user/video/1234567890?lang=en",
  ])("validates %s", (url) => {
    expect(isValidTikTokUrl(url)).toBe(true);
  });

  it.each([
    "https://youtube.com/watch?v=123",
    "https://tiktok.com",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isValidTikTokUrl(url)).toBe(false);
  });
});

describe("isValidInstagramUrl", () => {
  it.each([
    "https://www.instagram.com/p/CxYzAbCdEf/",
    "https://www.instagram.com/reel/CxYzAbCdEf/",
    "https://www.instagram.com/reels/CxYzAbCdEf/",
    "https://www.instagram.com/tv/CxYzAbCdEf/",
    "https://www.instagram.com/stories/highlights/12345/",
  ])("validates %s", (url) => {
    expect(isValidInstagramUrl(url)).toBe(true);
  });

  it.each([
    "https://instagram.com/",
    "https://www.instagram.com/users/123/",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isValidInstagramUrl(url)).toBe(false);
  });
});

describe("isValidFacebookUrl", () => {
  it.each([
    "https://www.facebook.com/watch/?v=123456",
    "https://fb.watch/abc123/",
    "https://www.facebook.com/reel/123456",
    "https://m.facebook.com/watch/?v=123",
  ])("validates %s", (url) => {
    expect(isValidFacebookUrl(url)).toBe(true);
  });

  it.each([
    "https://youtube.com/watch?v=123",
    "https://facebook.com",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isValidFacebookUrl(url)).toBe(false);
  });
});

describe("isValidTwitterUrl", () => {
  it.each([
    "https://twitter.com/user/status/1234567890",
    "https://x.com/user/status/1234567890",
    "https://www.twitter.com/user/status/1234567890",
    "https://www.x.com/user/status/1234567890",
  ])("validates %s", (url) => {
    expect(isValidTwitterUrl(url)).toBe(true);
  });

  it.each([
    "https://twitter.com/user",
    "https://x.com/",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isValidTwitterUrl(url)).toBe(false);
  });
});

describe("isValidThreadsUrl", () => {
  it.each([
    "https://www.threads.net/@user/post/1234567890",
    "https://threads.net/@user.post/post/1234567890",
    "https://www.threads.net/t/1234567890",
    "https://www.threads.com/@user/post/DZ4Nbh_EkCF",
    "https://threads.com/@user.name/post/AbC-123_xyz?xmt=abc",
  ])("validates %s", (url) => {
    expect(isValidThreadsUrl(url)).toBe(true);
  });

  it.each([
    "https://threads.net/",
    "https://www.threads.net/@user",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isValidThreadsUrl(url)).toBe(false);
  });
});

describe("isPlatformUrl", () => {
  it("detects youtube", () => {
    expect(isPlatformUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
  });

  it("detects tiktok", () => {
    expect(isPlatformUrl("https://vm.tiktok.com/abc")).toBe("tiktok");
  });

  it("detects instagram", () => {
    expect(isPlatformUrl("https://instagram.com/reel/abc")).toBe("instagram");
  });

  it("detects facebook", () => {
    expect(isPlatformUrl("https://fb.watch/abc")).toBe("facebook");
  });

  it("detects twitter", () => {
    expect(isPlatformUrl("https://x.com/user/status/123")).toBe("twitter");
  });

  it("detects threads", () => {
    expect(isPlatformUrl("https://threads.net/@user/post/123")).toBe(
      "threads",
    );
  });

  it("returns null for unknown URL", () => {
    expect(isPlatformUrl("https://example.com/video")).toBeNull();
  });
});
