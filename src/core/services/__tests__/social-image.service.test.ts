import {
  decodeSnapSaveResponse,
  extractFacebookEmbeddedImageUrls,
  extractTikwmImageUrls,
  isSupportedPostUrl,
} from "../social-image.service";

describe("extractFacebookEmbeddedImageUrls", () => {
  it("extracts and deduplicates large carousel photos", () => {
    const html = [
      '"image":{"height":1080,"uri":"https:\\/\\/scontent.example.fbcdn.net\\/v\\/t39.30808-6\\/photo-1.jpg?x=1\\u0026y=2","width":1080}',
      '"viewer_image":{"height":720,"uri":"https:\\/\\/scontent.example.fbcdn.net\\/v\\/t39.30808-6\\/photo-1.jpg?variant=2","width":720}',
      '"photo_image":{"height":900,"uri":"https:\\/\\/scontent.example.fbcdn.net\\/v\\/t39.30808-6\\/photo-2.jpg","width":1200}',
      '"image":{"height":80,"uri":"https:\\/\\/scontent.example.fbcdn.net\\/v\\/t39.30808-1\\/avatar.jpg","width":80}',
    ].join("");

    expect(extractFacebookEmbeddedImageUrls(html)).toEqual([
      "https://scontent.example.fbcdn.net/v/t39.30808-6/photo-1.jpg?variant=2",
      "https://scontent.example.fbcdn.net/v/t39.30808-6/photo-2.jpg",
    ]);
  });
});

describe("extractTikwmImageUrls", () => {
  it("returns photo-mode image URLs from a successful response", () => {
    expect(
      extractTikwmImageUrls({
        code: 0,
        data: { images: ["https://cdn.example/1.jpeg", "https://cdn.example/2.jpeg"] },
      }),
    ).toEqual([
      "https://cdn.example/1.jpeg",
      "https://cdn.example/2.jpeg",
    ]);
  });

  it("rejects unsuccessful or malformed responses", () => {
    expect(extractTikwmImageUrls({ code: -1, data: { images: ["bad"] } })).toEqual([]);
    expect(extractTikwmImageUrls({ code: 0, data: { images: "bad" } })).toEqual([]);
  });
});

describe("decodeSnapSaveResponse", () => {
  it("decodes the packed response without evaluating it", () => {
    const expected = '<div class="download">image</div>';
    const alphabet = "abcdZefghi";
    const shift = 41;
    const encoded = [...expected]
      .map((character) =>
        (character.charCodeAt(0) + shift)
          .toString(4)
          .replace(/[0-3]/g, (digit) => alphabet[Number(digit)]),
      )
      .join(alphabet[4]);
    const packed = `function x(){}("${encoded}",10,"${alphabet}",${shift},4,7))`;

    expect(decodeSnapSaveResponse(packed)).toBe(expected);
  });
});

describe("isSupportedPostUrl", () => {
  it.each([
    ["twitter", "https://x.com/user/status/123"],
    ["threads", "https://www.threads.com/@user/post/AbC_123"],
    ["instagram", "https://www.instagram.com/p/ABC123/"],
    ["facebook", "https://www.facebook.com/photo/?fbid=123"],
    ["tiktok", "https://www.tiktok.com/@user/photo/123"],
  ] as const)("allows %s URLs", (platform, url) => {
    expect(isSupportedPostUrl(url, platform)).toBe(true);
  });

  it("rejects a mismatched platform", () => {
    expect(
      isSupportedPostUrl("https://example.com/?next=https://x.com", "twitter"),
    ).toBe(false);
  });

  it("rejects non-HTTP protocols", () => {
    expect(isSupportedPostUrl("file:///etc/passwd", "facebook")).toBe(false);
  });
});
