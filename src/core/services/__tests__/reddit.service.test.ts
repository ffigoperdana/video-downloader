const mockExecPromise = jest.fn();
const mockExecStream = jest.fn();
const mockGetRedditPost = jest.fn();
const mockGetSocialImageAssets = jest.fn();

jest.mock("yt-dlp-wrap", () => {
  return jest.fn().mockImplementation(() => ({
    execPromise: mockExecPromise,
    execStream: mockExecStream,
  }));
});

jest.mock("../reddit-post.service", () => ({
  getRedditPost: mockGetRedditPost,
  getRedditPostThumbnail: jest.fn(() => "https://preview.redd.it/cover.jpg"),
  getRedditVideoDuration: jest.fn(() => 0),
  isRedditNativeVideo: jest.fn((post) => Boolean(post.is_video)),
}));

jest.mock("../social-image.service", () => ({
  getSocialImageAssets: mockGetSocialImageAssets,
}));

import { RedditDownloaderService } from "../reddit.service";

describe("RedditDownloaderService", () => {
  beforeEach(() => {
    mockExecPromise.mockReset();
    mockExecStream.mockReset();
    mockGetRedditPost.mockReset();
    mockGetSocialImageAssets.mockReset();
    mockExecStream.mockReturnValue({} as NodeJS.ReadableStream);
  });

  it("returns an image post without asking yt-dlp to extract video", async () => {
    mockGetRedditPost.mockResolvedValue({
      id: "1image",
      title: "A public image",
      author: "image_author",
      subreddit_name_prefixed: "r/pics",
      score: 42,
      is_video: false,
    });
    mockGetSocialImageAssets.mockResolvedValue([
      {
        index: 0,
        extension: "jpg",
        previewPath: "/internal/media/image?index=0",
        downloadPath: "/internal/media/image?index=0&download=1",
      },
    ]);

    const service = new RedditDownloaderService();

    await expect(
      service.getVideoInfo(
        "https://www.reddit.com/r/pics/comments/1image/a_public_image/",
      ),
    ).resolves.toMatchObject({
      id: "1image",
      media_type: "image",
      hasNoVideo: true,
      images: [{ index: 0 }],
    });
    expect(mockExecPromise).not.toHaveBeenCalled();
  });

  it("selects and merges Reddit's separate video and audio streams", () => {
    const service = new RedditDownloaderService();

    service.createDownloadStream(
      "https://www.reddit.com/r/videos/comments/1video/a_public_video/",
      "video",
    );

    const args = mockExecStream.mock.calls[0][0] as string[];
    const formatArg = args[args.indexOf("-f") + 1];

    expect(formatArg).toContain("bestvideo");
    expect(formatArg).toContain("bestaudio");
    expect(args).toContain("--merge-output-format");
    expect(args).toContain("mp4");
  });

  it("uses audio extraction for an MP3-only download", () => {
    const service = new RedditDownloaderService();

    service.createDownloadStream(
      "https://www.reddit.com/r/videos/comments/1video/a_public_video/",
      "audio",
    );

    const args = mockExecStream.mock.calls[0][0] as string[];
    expect(args[args.indexOf("-f") + 1]).toBe("bestaudio/best");
    expect(args).toEqual(expect.arrayContaining(["-x", "--audio-format", "mp3"]));
  });
});
