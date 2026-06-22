import {
  cleanThreadsUrl,
  isValidThreadsUrl,
} from "../threads.service";

describe("cleanThreadsUrl", () => {
  it("normalizes threads.net URLs", () => {
    expect(
      cleanThreadsUrl("https://www.threads.net/@user/post/1234567890"),
    ).toBe("https://www.threads.net/@user/post/1234567890");
  });

  it("strips query params", () => {
    expect(
      cleanThreadsUrl(
        "https://www.threads.net/@user/post/1234567890?ig_rid=abc",
      ),
    ).toBe("https://www.threads.net/@user/post/1234567890");
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
