const mockTiktokApiDownloader = jest.fn();

jest.mock("@tobyg74/tiktok-api-dl", () => ({
  Downloader: mockTiktokApiDownloader,
}));

import {
  decodeSnapSaveResponse,
  extractFacebookEmbeddedImageUrls,
  extractInstagramEmbedVideoUrls,
  extractInstaloaderMedia,
  extractSocialImages,
  extractTiktokApiDlImageUrls,
  extractThreadsMedia,
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

describe("extractTiktokApiDlImageUrls", () => {
  it("returns image URLs from a successful tiktok-api-dl image response", () => {
    expect(
      extractTiktokApiDlImageUrls({
        status: "success",
        result: {
          type: "image",
          images: ["https://cdn.example/image-1", "https://cdn.example/image-2"],
        },
      }),
    ).toEqual([
      "https://cdn.example/image-1",
      "https://cdn.example/image-2",
    ]);
  });

  it("rejects video responses and malformed responses", () => {
    expect(
      extractTiktokApiDlImageUrls({
        status: "success",
        result: { type: "video", images: ["bad"] },
      }),
    ).toEqual([]);
    expect(
      extractTiktokApiDlImageUrls({
        status: "error",
        result: { type: "image", images: ["bad"] },
      }),
    ).toEqual([]);
  });
});

describe("extractInstaloaderMedia", () => {
  it("keeps sidecar item order and defaults extensions for Instagram CDN URLs", () => {
    expect(
      extractInstaloaderMedia({
        items: [
          { type: "video", url: "https://instagram.example/video?token=1" },
          { type: "image", url: "https://instagram.example/image?token=2" },
        ],
      }),
    ).toEqual([
      {
        type: "video",
        remoteUrl: "https://instagram.example/video?token=1",
        extension: "mp4",
      },
      {
        type: "image",
        remoteUrl: "https://instagram.example/image?token=2",
        extension: "jpg",
      },
    ]);
  });
});

describe("extractInstagramEmbedVideoUrls", () => {
  it("reads an escaped progressive Reel URL when the normal post page only has a cover", () => {
    const html = String.raw`
      <meta property="og:image" content="https://scontent.cdninstagram.com/cover.jpg" />
      <script>
        {\"video_url\":\"https:\\\/\\\/instagram.fcgk12-2.fna.fbcdn.net\\\/o1\\\/v\\\/reel-stream?token=abc\\u0026quality=720\"}
      </script>
    `;

    expect(extractInstagramEmbedVideoUrls(html)).toEqual([
      "https://instagram.fcgk12-2.fna.fbcdn.net/o1/v/reel-stream?token=abc&quality=720",
    ]);
  });

  it("accepts extension-less progressive CDN URLs but rejects arbitrary URLs in page text", () => {
    const html = String.raw`
      <script>
        {"video_url":"https:\/\/scontent.cdninstagram.com\/o1\/v\/stream?token=valid"}
        {"video_url":"https:\/\/attacker.example\/collect.mp4"}
      </script>
    `;

    expect(extractInstagramEmbedVideoUrls(html)).toEqual([
      "https://scontent.cdninstagram.com/o1/v/stream?token=valid",
    ]);
  });
});

describe("extractSocialImages TikTok fallback", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("keeps TikWM image links without file extensions", async () => {
    mockTiktokApiDownloader.mockResolvedValue({ status: "error" });
    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const target = String(input);
      if (target.includes("tikwm.com/api")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            data: {
              images: ["https://tikwm.example/get?token=image-token"],
            },
          }),
        };
      }

      return {
        ok: true,
        text: async () => "<html></html>",
      };
    }) as unknown as typeof fetch;

    await expect(
      extractSocialImages("https://www.tiktok.com/@user/photo/7631797579776380178", "tiktok"),
    ).resolves.toEqual([
      {
        remoteUrl: "https://tikwm.example/get?token=image-token",
        extension: "jpeg",
      },
    ]);
  });

  it("prefers tiktok-api-dl image links over TikWM links", async () => {
    mockTiktokApiDownloader.mockResolvedValue({
      status: "success",
      result: {
        type: "image",
        images: ["https://api-dl.example/get?token=image-token"],
      },
    });
    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const target = String(input);
      if (target.includes("tikwm.com/api")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            data: {
              images: ["https://tikwm.example/get?token=stale-image-token"],
            },
          }),
        };
      }

      return {
        ok: true,
        text: async () => "<html></html>",
      };
    }) as unknown as typeof fetch;

    await expect(
      extractSocialImages("https://www.tiktok.com/@user/photo/7631797579776380178", "tiktok"),
    ).resolves.toEqual([
      {
        remoteUrl: "https://api-dl.example/get?token=image-token",
        extension: "jpeg",
      },
    ]);
  });
});

describe("extractThreadsMedia", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("keeps LoveThreads image links that do not include a file extension", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        data: `
          <ul class="download-box">
            <li>
              <span class="format-icon"><i class="icon icon-dlimage"></i></span>
              <div class="photo-option">
                <option value="https://dl.snapcdn.app/get?token=image-token">1080x1080</option>
              </div>
            </li>
          </ul>
        `,
      }),
    }) as unknown as typeof fetch;

    await expect(
      extractThreadsMedia("https://www.threads.com/@user/post/DZ5aSRWk6EZ"),
    ).resolves.toEqual({
      images: [
        {
          remoteUrl: "https://dl.snapcdn.app/get?token=image-token",
          extension: "jpg",
        },
      ],
      videos: [],
    });
  });

  it("reuses cached Threads media for repeated preview requests", async () => {
    const sourceUrl = "https://www.threads.com/@user/post/DZCACHE123";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        data: `
          <ul class="download-box">
            <li>
              <span class="format-icon"><i class="icon icon-dlimage"></i></span>
              <div class="photo-option">
                <option value="https://dl.snapcdn.app/get?token=cached-image">1080x1080</option>
              </div>
            </li>
          </ul>
        `,
      }),
    }) as unknown as typeof fetch;

    await expect(extractThreadsMedia(sourceUrl)).resolves.toEqual({
      images: [
        {
          remoteUrl: "https://dl.snapcdn.app/get?token=cached-image",
          extension: "jpg",
        },
      ],
      videos: [],
    });

    (global.fetch as jest.Mock).mockClear();

    await expect(extractThreadsMedia(sourceUrl)).resolves.toEqual({
      images: [
        {
          remoteUrl: "https://dl.snapcdn.app/get?token=cached-image",
          extension: "jpg",
        },
      ],
      videos: [],
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("keeps Threads image links when LoveThreads returns video too", async () => {
    const sourceUrl = "https://www.threads.com/@user/post/DZMIXED123";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        data: `
          <ul class="download-box">
            <li>
              <span class="format-icon"><i class="icon icon-dlvideo"></i></span>
              <div class="download-items__btn">
                <a title="Download Video" href="https://dl.snapcdn.app/video.mp4">Download</a>
              </div>
            </li>
            <li>
              <span class="format-icon"><i class="icon icon-dlimage"></i></span>
              <div class="photo-option">
                <option value="https://dl.snapcdn.app/get?token=mixed-image">1080x1080</option>
              </div>
            </li>
          </ul>
        `,
      }),
    }) as unknown as typeof fetch;

    await expect(extractThreadsMedia(sourceUrl)).resolves.toEqual({
      images: [
        {
          remoteUrl: "https://dl.snapcdn.app/get?token=mixed-image",
          extension: "jpg",
        },
      ],
      videos: [
        {
          remoteUrl: "https://dl.snapcdn.app/video.mp4",
          extension: "mp4",
        },
      ],
    });

    await expect(extractSocialImages(sourceUrl, "threads")).resolves.toEqual([
      {
        remoteUrl: "https://dl.snapcdn.app/get?token=mixed-image",
        extension: "jpg",
      },
    ]);
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
