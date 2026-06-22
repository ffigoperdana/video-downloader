import {
  cleanYoutubeInputUrl,
  isYoutubePlaylistUrl,
} from "../youtube.service";

describe("YouTube playlist URL handling", () => {
  it("preserves playlist identity while removing playback tracking", () => {
    expect(
      cleanYoutubeInputUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1",
      ),
    ).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ",
    );
  });

  it("normalizes playlist-only URLs", () => {
    expect(
      cleanYoutubeInputUrl(
        "https://youtube.com/playlist?list=PL123_abc-XYZ&si=tracking",
      ),
    ).toBe("https://www.youtube.com/playlist?list=PL123_abc-XYZ");
  });

  it("distinguishes playlists from individual videos", () => {
    expect(
      isYoutubePlaylistUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ",
      ),
    ).toBe(true);
    expect(
      isYoutubePlaylistUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ),
    ).toBe(false);
  });
});
