const mockExecPromise = jest.fn();
const mockGetSocialImageAssets = jest.fn();

jest.mock("yt-dlp-wrap", () => {
  return jest.fn().mockImplementation(() => ({
    execPromise: mockExecPromise,
  }));
});

jest.mock("../social-image.service", () => ({
  getSocialImageAssets: mockGetSocialImageAssets,
}));

import { TikTokDownloaderService } from "../tiktok.service";

describe("TikTokDownloaderService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockExecPromise.mockResolvedValue(JSON.stringify({
      id: "7638498219542056210",
      title: "Photo post",
      duration: 12,
      url: "https://example.com/video.mp4",
      formats: [{ format_id: "download", ext: "mp4", vcodec: "h264", acodec: "aac" }],
    }));
    mockGetSocialImageAssets.mockResolvedValue([
      {
        index: 0,
        extension: "jpeg",
        previewPath: "/internal/media/image?index=0",
        downloadPath: "/internal/media/image?index=0&download=1",
      },
      {
        index: 1,
        extension: "jpeg",
        previewPath: "/internal/media/image?index=1",
        downloadPath: "/internal/media/image?index=1&download=1",
      },
    ]);
  });

  it("treats /photo/ URLs as image posts even when yt-dlp returns video-like metadata", async () => {
    const service = new TikTokDownloaderService();

    await expect(
      service.getVideoInfo("https://www.tiktok.com/@user/photo/7638498219542056210"),
    ).resolves.toMatchObject({
      id: "7638498219542056210",
      media_type: "image",
      hasNoVideo: true,
      formats: [],
      images: [
        { index: 0, extension: "jpeg" },
        { index: 1, extension: "jpeg" },
      ],
    });
  });

  it("resolves vt.tiktok.com photo links before deciding media type", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "location"
            ? "https://www.tiktok.com/@notzee.e/photo/7631797579776380178?_r=1"
            : null,
      },
    }) as unknown as typeof fetch;
    const service = new TikTokDownloaderService();

    await expect(
      service.getVideoInfo("https://vt.tiktok.com/ZSCdRjyV2/"),
    ).resolves.toMatchObject({
      id: "7631797579776380178",
      media_type: "image",
      hasNoVideo: true,
      images: [{ index: 0 }, { index: 1 }],
    });
  });

  it("falls back to the canonical photo URL from yt-dlp errors when shortlink resolution fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: { get: () => null },
      url: "https://vt.tiktok.com/ZSCdRjyV2/",
    }) as unknown as typeof fetch;
    mockExecPromise.mockRejectedValue(
      new Error(
        "ERROR: Unsupported URL: https://www.tiktok.com/@notzee.e/photo/7631797579776380178?_r=1",
      ),
    );

    const service = new TikTokDownloaderService();

    await expect(
      service.getVideoInfo("https://vt.tiktok.com/ZSCdRjyV2/"),
    ).resolves.toMatchObject({
      id: "7631797579776380178",
      media_type: "image",
      hasNoVideo: true,
      images: [{ index: 0 }, { index: 1 }],
    });
    expect(mockGetSocialImageAssets).toHaveBeenCalledWith(
      "https://www.tiktok.com/@notzee.e/photo/7631797579776380178",
      "tiktok",
    );
  });
});
