import {
  decodeSnapSaveResponse,
  isSupportedPostUrl,
} from "../social-image.service";

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
