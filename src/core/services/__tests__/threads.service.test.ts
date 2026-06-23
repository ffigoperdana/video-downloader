const mockExecPromise = jest.fn();
const mockGetThreadsMediaAssets = jest.fn();

jest.mock("yt-dlp-wrap", () => {
  return jest.fn().mockImplementation(() => ({
    execPromise: mockExecPromise,
  }));
});

jest.mock("../social-image.service", () => ({
  getThreadsMediaAssets: mockGetThreadsMediaAssets,
}));

import {
  cleanThreadsUrl,
  isValidThreadsUrl,
  ThreadsDownloaderService,
} from "../threads.service";

describe("cleanThreadsUrl", () => {
  it("normalizes legacy threads.net URLs to threads.com", () => {
    expect(
      cleanThreadsUrl("https://www.threads.net/@user/post/1234567890"),
    ).toBe("https://www.threads.com/@user/post/1234567890");
  });

  it("strips query params", () => {
    expect(
      cleanThreadsUrl(
        "https://www.threads.net/@user/post/1234567890?ig_rid=abc",
      ),
    ).toBe("https://www.threads.com/@user/post/1234567890");
  });

  it("returns non-threads URLs unchanged", () => {
    const url = "https://youtube.com/watch?v=abc";
    expect(cleanThreadsUrl(url)).toBe(url);
  });

  it("returns invalid URLs unchanged", () => {
    expect(cleanThreadsUrl("not a url")).toBe("not a url");
  });
});

describe("isValidThreadsUrl", () => {
  it.each([
    "https://www.threads.net/@user/post/1234567890",
    "https://threads.net/@user/post/1234567890",
    "https://www.threads.net/@user.name/post/1234567890",
    "https://www.threads.net/t/1234567890",
    "https://threads.net/t/1234567890",
    "https://threads.com/@user/post/DZ4Nbh_EkCF",
    "https://www.threads.com/@user.name/post/AbC-123_xyz",
  ])("validates %s", (url) => {
    expect(isValidThreadsUrl(url)).toBe(true);
  });

  it.each([
    "https://threads.net/",
    "https://www.threads.net/@user",
    "https://www.threads.net/@user/post/",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isValidThreadsUrl(url)).toBe(false);
  });
});

describe("ThreadsDownloaderService", () => {
  beforeEach(() => {
    mockExecPromise.mockReset();
    mockGetThreadsMediaAssets.mockReset();
  });

  it("uses direct Threads media before trying yt-dlp", async () => {
    mockGetThreadsMediaAssets.mockResolvedValue({
      images: [
        {
          index: 0,
          extension: "jpg",
          previewPath: "/internal/media/image?platform=threads&index=0",
          downloadPath: "/internal/media/image?platform=threads&index=0&download=1",
        },
      ],
      videos: [],
    });

    const service = new ThreadsDownloaderService();

    await expect(
      service.getVideoInfo("https://www.threads.com/@zainalsalamun/post/DZ6gqDfDpe5"),
    ).resolves.toMatchObject({
      media_type: "image",
      hasNoVideo: true,
      images: [{ index: 0 }],
      uploader_id: "zainalsalamun",
    });
    expect(mockExecPromise).not.toHaveBeenCalled();
  });
});
