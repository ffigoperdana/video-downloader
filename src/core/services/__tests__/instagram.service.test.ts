const mockExecPromise = jest.fn();
const mockGetInstagramMediaAssets = jest.fn();

jest.mock("yt-dlp-wrap", () => {
  return jest.fn().mockImplementation(() => ({
    execPromise: mockExecPromise,
  }));
});

jest.mock("../social-image.service", () => ({
  getInstagramMediaAssets: mockGetInstagramMediaAssets,
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
  beforeEach(() => {
    mockExecPromise.mockResolvedValue(JSON.stringify({
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
    }));
    mockGetInstagramMediaAssets.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.INSTAGRAM_COOKIES_PATH;
    delete process.env.INSTAGRAM_COOKIES_BASE64;
    delete process.env.SOCIAL_COOKIES_BASE64;
  });

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

  it("uses mixed-media fallback when a carousel starts with video but yt-dlp entries look image-only", async () => {
    mockExecPromise.mockResolvedValue(JSON.stringify({
      _type: "playlist",
      id: "carousel",
      title: "Fallback carousel",
      entries: [
        {
          id: "thumb-1",
          thumbnail: "https://instagram.example/thumb1.jpg",
          url: "https://instagram.example/thumb1.jpg",
          formats: [],
        },
        {
          id: "image-slide",
          thumbnail: "https://instagram.example/image.jpg",
          url: "https://instagram.example/image.jpg",
          formats: [],
        },
      ],
    }));
    mockGetInstagramMediaAssets.mockResolvedValue({
      images: [
        {
          index: 0,
          extension: "jpg",
          previewPath: "/internal/media/image?index=0",
          downloadPath: "/internal/media/image?index=0&download=1",
        },
      ],
      videos: [
        {
          index: 0,
          downloadPath: "/internal/media/video?platform=instagram&index=0",
        },
      ],
      items: [
        {
          type: "video",
          index: 0,
          downloadPath: "/internal/media/video?platform=instagram&index=0",
        },
        {
          type: "image",
          index: 0,
          previewPath: "/internal/media/image?index=0",
          downloadPath: "/internal/media/image?index=0&download=1",
        },
      ],
    });

    const service = new InstagramDownloaderService();

    await expect(
      service.getVideoInfo("https://www.instagram.com/p/ABC123/"),
    ).resolves.toMatchObject({
      hasNoVideo: false,
      entries: [
        {
          isVideo: true,
          downloadPath: "/internal/media/video?platform=instagram&index=0",
        },
        { isVideo: false },
      ],
      images: [{ index: 0 }],
    });
  });

  it("does not classify a Reel cover image as an image-only post", async () => {
    mockGetInstagramMediaAssets.mockResolvedValue({
      images: [
        {
          index: 0,
          extension: "jpg",
          previewPath: "/internal/media/image?index=0",
          downloadPath: "/internal/media/image?index=0&download=1",
        },
      ],
      videos: [],
      items: [
        {
          type: "image",
          index: 0,
          previewPath: "/internal/media/image?index=0",
          downloadPath: "/internal/media/image?index=0&download=1",
        },
      ],
    });
    mockExecPromise.mockResolvedValue(JSON.stringify({
      id: "Dax-0hWjdLK",
      title: "A public Reel",
      ext: "mp4",
      url: "https://cdn.instagram.example/reel.mp4",
      formats: [],
    }));

    const service = new InstagramDownloaderService();
    const result = await service.getVideoInfo(
      "https://www.instagram.com/reel/Dax-0hWjdLK/?igsh=aHIweXE2MnoweG56",
    );

    expect(mockExecPromise).toHaveBeenCalledWith(
      expect.arrayContaining([
        "https://www.instagram.com/reel/Dax-0hWjdLK/",
        "-J",
      ]),
    );
    expect(result).toMatchObject({
      id: "Dax-0hWjdLK",
      media_type: "reel",
      hasNoVideo: false,
      images: [],
    });
  });

  it("uses a direct embed Reel video before trying yt-dlp and keeps its cover out of image downloads", async () => {
    mockGetInstagramMediaAssets.mockResolvedValue({
      images: [
        {
          index: 0,
          extension: "jpg",
          previewPath: "/internal/media/image?index=0",
          downloadPath: "/internal/media/image?index=0&download=1",
        },
      ],
      videos: [
        {
          index: 0,
          downloadPath: "/internal/media/video?platform=instagram&index=0&download=1",
        },
      ],
      items: [
        {
          type: "video",
          index: 0,
          downloadPath: "/internal/media/video?platform=instagram&index=0&download=1",
        },
      ],
    });

    const service = new InstagramDownloaderService();
    const result = await service.getVideoInfo(
      "https://www.instagram.com/reel/Dax-0hWjdLK/",
    );

    expect(mockExecPromise).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      media_type: "reel",
      hasNoVideo: false,
      images: [],
      entries: [
        {
          isVideo: true,
          downloadPath: "/internal/media/video?platform=instagram&index=0&download=1",
        },
      ],
    });
  });

  it("uses the dedicated Instagram cookie path for yt-dlp Reel extraction", async () => {
    process.env.INSTAGRAM_COOKIES_PATH = "/run/secrets/instagram-cookies.txt";
    mockGetInstagramMediaAssets.mockResolvedValue({
      images: [],
      videos: [],
      items: [],
    });
    mockExecPromise.mockResolvedValue(JSON.stringify({
      id: "Dax-0hWjdLK",
      ext: "mp4",
      url: "https://cdn.instagram.example/reel.mp4",
      formats: [],
    }));

    const service = new InstagramDownloaderService();
    await service.getVideoInfo("https://www.instagram.com/reel/Dax-0hWjdLK/");

    expect(mockExecPromise).toHaveBeenCalledWith(
      expect.arrayContaining([
        "--cookies",
        "/run/secrets/instagram-cookies.txt",
      ]),
    );
  });

  it("falls back to the shared social cookies when the dedicated value is empty", async () => {
    process.env.INSTAGRAM_COOKIES_BASE64 = "";
    process.env.SOCIAL_COOKIES_BASE64 = Buffer.from("# Netscape HTTP Cookie File").toString("base64");
    mockGetInstagramMediaAssets.mockResolvedValue({
      images: [],
      videos: [],
      items: [],
    });
    mockExecPromise.mockResolvedValue(JSON.stringify({
      id: "Dax-0hWjdLK",
      ext: "mp4",
      url: "https://cdn.instagram.example/reel.mp4",
      formats: [],
    }));

    const service = new InstagramDownloaderService();
    await service.getVideoInfo("https://www.instagram.com/reel/Dax-0hWjdLK/");

    expect(mockExecPromise).toHaveBeenCalledWith(
      expect.arrayContaining(["--cookies", expect.stringContaining("instagram-cookies.txt")]),
    );
  });

  it("surfaces a Reel extraction failure instead of presenting its cover as an image post", async () => {
    mockGetInstagramMediaAssets.mockResolvedValue({
      images: [
        {
          index: 0,
          extension: "jpg",
          previewPath: "/internal/media/image?index=0",
          downloadPath: "/internal/media/image?index=0&download=1",
        },
      ],
      videos: [],
      items: [
        {
          type: "image",
          index: 0,
          previewPath: "/internal/media/image?index=0",
          downloadPath: "/internal/media/image?index=0&download=1",
        },
      ],
    });
    mockExecPromise.mockRejectedValue(new Error("Instagram login required"));

    const service = new InstagramDownloaderService();

    await expect(
      service.getVideoInfo("https://www.instagram.com/reel/Dax-0hWjdLK/"),
    ).rejects.toThrow("Instagram confirmed this link is a Reel");
  });
});
