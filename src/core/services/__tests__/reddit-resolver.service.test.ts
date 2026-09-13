import { resolveRedditUrl } from "../reddit-resolver.service";

describe("Reddit URL resolver", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("follows the current subreddit share alias to a canonical post URL", async () => {
    const sourceUrl = "https://www.reddit.com/r/indowibu/s/RESOLVE_REDIRECT_1";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 302,
      url: sourceUrl,
      headers: {
        get: () =>
          "https://www.reddit.com/r/indowibu/comments/1oc9pow/a_post_title/",
      },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(resolveRedditUrl(sourceUrl)).resolves.toBe(
      "https://www.reddit.com/r/indowibu/comments/1oc9pow/a_post_title",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      sourceUrl,
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("reads a canonical post URL from a share landing page", async () => {
    const sourceUrl = "https://www.reddit.com/r/indowibu/s/RESOLVE_HTML_2";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: sourceUrl,
      headers: { get: () => null },
      text: async () =>
        '<meta property="og:url" content="https://www.reddit.com/r/indowibu/comments/1oc9pow/a_post_title/?utm_source=share" />',
    }) as unknown as typeof fetch;

    await expect(resolveRedditUrl(sourceUrl)).resolves.toBe(
      "https://www.reddit.com/r/indowibu/comments/1oc9pow/a_post_title",
    );
  });

  it("does not follow a share alias to an external host", async () => {
    const sourceUrl = "https://www.reddit.com/r/indowibu/s/RESOLVE_EXTERNAL_3";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 302,
      url: sourceUrl,
      headers: { get: () => "https://example.com/redirect" },
    }) as unknown as typeof fetch;

    await expect(resolveRedditUrl(sourceUrl)).resolves.toBe(sourceUrl);
  });
});
