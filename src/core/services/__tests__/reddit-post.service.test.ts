import {
  extractRedditImageUrls,
  getRedditPost,
  getRedditPostThumbnail,
  getRedditVideoDuration,
  isRedditNativeVideo,
  type RedditPost,
} from "../reddit-post.service";

describe("Reddit post metadata parser", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("reads the first post from Reddit's public listing payload", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          data: {
            children: [
              {
                data: {
                  id: "1json",
                  title: "Public JSON post",
                  author: "saveit_user",
                },
              },
            ],
          },
        },
      ],
    }) as unknown as typeof fetch;

    await expect(
      getRedditPost(
        "https://www.reddit.com/r/test/comments/1json/public_json_post/",
      ),
    ).resolves.toMatchObject({
      id: "1json",
      title: "Public JSON post",
      author: "saveit_user",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://www.reddit.com/comments/1json.json?raw_json=1",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("keeps public gallery image order and unescapes source URLs", () => {
    const post: RedditPost = {
      gallery_data: {
        items: [{ media_id: "first" }, { media_id: "second" }],
      },
      media_metadata: {
        first: {
          s: {
            u: "https://i.redd.it/first-image.jpg?width=1200&amp;format=pjpg",
          },
        },
        second: {
          p: [
            { u: "https://preview.redd.it/second-image.jpg?width=320" },
            { u: "https://preview.redd.it/second-image.jpg?width=1080" },
          ],
        },
      },
    };

    expect(extractRedditImageUrls(post)).toEqual([
      "https://i.redd.it/first-image.jpg?width=1200&format=pjpg",
      "https://preview.redd.it/second-image.jpg?width=1080",
    ]);
  });

  it("uses a direct i.redd.it image when a post is not a gallery", () => {
    const post: RedditPost = {
      url_overridden_by_dest: "https://i.redd.it/direct-image.png",
      preview: {
        images: [
          {
            source: {
              url: "https://preview.redd.it/direct-image.png?width=640",
            },
          },
        ],
      },
    };

    expect(extractRedditImageUrls(post)).toEqual([
      "https://i.redd.it/direct-image.png",
    ]);
    expect(getRedditPostThumbnail(post)).toBe(
      "https://preview.redd.it/direct-image.png?width=640",
    );
  });

  it("does not expose a video thumbnail as an image download", () => {
    const post: RedditPost = {
      is_video: true,
      media: {
        reddit_video: {
          duration: 42,
          fallback_url: "https://v.redd.it/video/DASH_720.mp4",
        },
      },
      preview: {
        images: [
          {
            source: {
              url: "https://preview.redd.it/video-cover.jpg?width=1080",
            },
          },
        ],
      },
    };

    expect(isRedditNativeVideo(post)).toBe(true);
    expect(getRedditVideoDuration(post)).toBe(42);
    expect(extractRedditImageUrls(post)).toEqual([]);
    expect(getRedditPostThumbnail(post)).toBe(
      "https://preview.redd.it/video-cover.jpg?width=1080",
    );
  });
});
