import {
  resolveThreadsUrl,
  resolveThreadsUrlCandidates,
} from "../threads-resolver.service";

describe("Threads URL resolver", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("follows a Threads redirect to the canonical post URL", async () => {
    const sourceUrl = "https://www.threads.com/share/RESOLVE_REDIRECT_1";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 302,
      url: sourceUrl,
      headers: {
        get: () => "https://www.threads.com/@alice/post/DREDIRECT123",
      },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(resolveThreadsUrlCandidates(sourceUrl)).resolves.toEqual([
      "https://www.threads.com/@alice/post/DREDIRECT123",
      sourceUrl,
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      sourceUrl,
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("reads the canonical URL from a share page", async () => {
    const sourceUrl = "https://www.threads.com/share/RESOLVE_HTML_2";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: sourceUrl,
      headers: { get: () => null },
      text: async () =>
        '<meta property="og:url" content="https://www.threads.com/@bob/post/DHTML123?xmt=tracking" />',
    }) as unknown as typeof fetch;

    await expect(resolveThreadsUrl(sourceUrl)).resolves.toBe(
      "https://www.threads.com/@bob/post/DHTML123",
    );
  });

  it("uses Meta oEmbed when the share page has no permalink metadata", async () => {
    const sourceUrl = "https://www.threads.com/share/RESOLVE_OEMBED_3?xmt=token";
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: "https://www.threads.com/share/RESOLVE_OEMBED_3/",
        headers: { get: () => null },
        text: async () => "<html><body>Loading...</body></html>",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          html: '<blockquote data-text-post-permalink="https://www.threads.com/@carol/post/DOEMBED123"></blockquote>',
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(resolveThreadsUrl(sourceUrl)).resolves.toBe(
      "https://www.threads.com/@carol/post/DOEMBED123",
    );
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "graph.threads.com/oembed",
    );
  });

  it("does not follow a share redirect to an external host", async () => {
    const sourceUrl = "https://www.threads.com/share/RESOLVE_EXTERNAL_4";
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        url: sourceUrl,
        headers: { get: () => "https://example.com/redirect" },
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(resolveThreadsUrl(sourceUrl)).resolves.toBe(sourceUrl);
    expect(String(fetchMock.mock.calls[0][0])).toContain("threads.com/share");
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "graph.threads.com/oembed",
    );
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("example.com");
  });
});
