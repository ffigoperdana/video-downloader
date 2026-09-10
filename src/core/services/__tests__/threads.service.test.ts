const mockExecPromise = jest.fn();
const mockGetThreadsMediaAssets = jest.fn();
const mockResolveThreadsUrlCandidates = jest.fn();

jest.mock("yt-dlp-wrap", () => {
  return jest.fn().mockImplementation(() => ({
    execPromise: mockExecPromise,
  }));
});

jest.mock("../social-image.service", () => ({
  getThreadsMediaAssets: mockGetThreadsMediaAssets,
}));

jest.mock("../threads-resolver.service", () => ({
  resolveThreadsUrlCandidates: mockResolveThreadsUrlCandidates,
}));

import {
  cleanThreadsUrl,
  getThreadsUrlCandidates,
  isValidThreadsUrl,
  ThreadsDownloaderService,
} from "../threads.service";
import { buildThreadsDownloadFilename } from "../../utils/threads-url";

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

  it("keeps the new share path while stripping tracking params", () => {
    expect(
      cleanThreadsUrl(
        "https://www.threads.net/share/Fc4SJIEJOJ/?xmt=abc&slof=1",
      ),
    ).toBe("https://www.threads.com/share/Fc4SJIEJOJ");
  });

  it("can preserve share hand-off parameters while resolving", () => {
    expect(
      cleanThreadsUrl(
        "https://www.threads.net/share/Fc4SJIEJOJ/?xmt=abc&slof=1",
        { preserveQuery: true },
      ),
    ).toBe("https://www.threads.com/share/Fc4SJIEJOJ?xmt=abc&slof=1");
  });

  it("keeps share aliases opaque until the resolver expands them", () => {
    expect(
      getThreadsUrlCandidates("https://www.threads.com/share/Fc4SJIEJOJ/"),
    ).toEqual(["https://www.threads.com/share/Fc4SJIEJOJ"]);
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
    "https://www.threads.com/@/post/Fc4SJIEJOJ",
    "https://www.threads.com/share/Fc4SJIEJOJ/",
  ])("validates %s", (url) => {
    expect(isValidThreadsUrl(url)).toBe(true);
  });

  it.each([
    "https://threads.net/",
    "https://www.threads.net/@user",
    "https://www.threads.net/@user/post/",
    "https://www.threads.com/share/",
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
    mockResolveThreadsUrlCandidates.mockReset();
    mockResolveThreadsUrlCandidates.mockImplementation(async (url: string) => [url]);
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
      videos: [],
      uploader_id: "zainalsalamun",
    });
    expect(mockExecPromise).not.toHaveBeenCalled();
  });

  it("keeps direct Threads images when the same post also has video", async () => {
    mockGetThreadsMediaAssets.mockResolvedValue({
      images: [
        {
          index: 0,
          extension: "jpg",
          previewPath: "/internal/media/image?platform=threads&index=0",
          downloadPath: "/internal/media/image?platform=threads&index=0&download=1",
        },
      ],
      videos: [
        {
          index: 0,
          downloadPath: "/internal/media/video?platform=threads&index=0&download=1",
        },
      ],
    });

    const service = new ThreadsDownloaderService();

    await expect(
      service.getVideoInfo("https://www.threads.com/@user/post/DZMIXED123"),
    ).resolves.toMatchObject({
      media_type: "mixed",
      hasNoVideo: false,
      images: [{ index: 0 }],
      videos: [{ index: 0 }],
    });
    expect(mockExecPromise).not.toHaveBeenCalled();
  });

  it("keeps the post id when a share alias returns direct media", async () => {
    mockGetThreadsMediaAssets.mockResolvedValue({
      images: [],
      videos: [
        {
          index: 0,
          downloadPath: "/internal/media/video?platform=threads&index=0&download=1",
        },
      ],
    });

    const service = new ThreadsDownloaderService();

    await expect(
      service.getVideoInfo("https://www.threads.com/share/Fc4SJIEJOJ/"),
    ).resolves.toMatchObject({
      id: "Fc4SJIEJOJ",
      media_type: "video",
      hasNoVideo: false,
      uploader_id: "",
    });
    expect(mockExecPromise).not.toHaveBeenCalled();
  });

  it("uses canonical metadata when a share alias is resolved", async () => {
    mockResolveThreadsUrlCandidates.mockResolvedValue([
      "https://www.threads.com/@alice/post/DRESOLVED123",
      "https://www.threads.com/share/SHARE123",
    ]);
    mockGetThreadsMediaAssets.mockResolvedValue({
      images: [],
      videos: [
        {
          index: 0,
          downloadPath: "/internal/media/video?platform=threads&index=0&download=1",
        },
      ],
    });

    const service = new ThreadsDownloaderService();

    await expect(
      service.getVideoInfo("https://www.threads.com/share/SHARE123"),
    ).resolves.toMatchObject({
      id: "DRESOLVED123",
      uploader_id: "alice",
      uploader: "alice",
    });
  });
});

describe("buildThreadsDownloadFilename", () => {
  it("includes the Threads username and post id for video downloads", () => {
    expect(
      buildThreadsDownloadFilename(
        "https://www.threads.com/@alice/post/DABC123",
        { extension: "mp4", mediaType: "video" },
      ),
    ).toBe("threads-alice-DABC123-video-1.mp4");
  });

  it("uses resolved metadata when a share URL has no canonical path", () => {
    expect(
      buildThreadsDownloadFilename("https://www.threads.com/share/SHARE123", {
        extension: "jpg",
        mediaType: "image",
        index: 1,
        username: "bob",
        postId: "DPOST456",
      }),
    ).toBe("threads-bob-DPOST456-image-2.jpg");
  });
});
