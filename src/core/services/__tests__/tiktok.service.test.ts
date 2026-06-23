jest.mock("yt-dlp-wrap", () => {
  return jest.fn().mockImplementation(() => ({
    execPromise: jest.fn().mockResolvedValue(JSON.stringify({
      id: "7638498219542056210",
      title: "Photo post",
      duration: 12,
      url: "https://example.com/video.mp4",
      formats: [{ format_id: "download", ext: "mp4", vcodec: "h264", acodec: "aac" }],
    })),
  }));
});

jest.mock("../social-image.service", () => ({
  getSocialImageAssets: jest.fn().mockResolvedValue([
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
  ]),
}));

import { TikTokDownloaderService } from "../tiktok.service";

describe("TikTokDownloaderService", () => {
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
});
