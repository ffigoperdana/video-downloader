jest.mock("yt-dlp-wrap", () => {
  return jest.fn().mockImplementation(() => ({
    execPromise: jest.fn().mockResolvedValue(JSON.stringify({
      _type: "playlist",
      id: "carousel",
      title: "Mixed carousel",
      entries: [
        {
          id: "image-slide",
          title: "Image slide",
          thumbnail: "https://instagram.example/image.jpg",
          url: "https://instagram.example/image.jpg",
          formats: [],
        },
        {
          id: "video-slide",
          title: "Video slide",
          thumbnail: "https://instagram.example/video-thumb.jpg",
          url: "https://instagram.example/video.mp4",
          formats: [],
        },
      ],
    })),
  }));
});

jest.mock("../social-image.service", () => ({
  getSocialImageAssets: jest.fn().mockResolvedValue([
    {
      index: 0,
      extension: "jpg",
      previewPath: "/internal/media/image?index=0",
      downloadPath: "/internal/media/image?index=0&download=1",
    },
  ]),
}));

import { InstagramDownloaderService } from "../instagram.service";

describe("InstagramDownloaderService", () => {
  it("marks mixed carousel video slides as video even when entry formats are missing", async () => {
    const service = new InstagramDownloaderService();

    await expect(
      service.getVideoInfo("https://www.instagram.com/p/ABC123/"),
    ).resolves.toMatchObject({
      hasNoVideo: false,
      entries: [
        { id: "image-slide", isVideo: false },
        { id: "video-slide", isVideo: true },
      ],
      images: [{ index: 0 }],
    });
  });
});
