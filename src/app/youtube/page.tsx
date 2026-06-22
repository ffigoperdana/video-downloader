import type { Metadata } from "next";
import YoutubeDownloader from "./youtube-downloader";

export const metadata: Metadata = {
  title: "YouTube Video Downloader — HD 1080p, MP4, Audio",
  description:
    "Download YouTube videos, Shorts, playlists, and MP3 audio with sequential progress tracking.",
  keywords: [
    "youtube downloader",
    "download youtube video",
    "youtube to mp4",
    "youtube 1080p download",
    "youtube shorts download",
    "youtube playlist downloader",
  ],
  alternates: { canonical: "https://saveit.app/youtube" },
  openGraph: {
    title: "YouTube Downloader — HD 1080p Free",
    description:
      "Download YouTube videos in HD quality. MP4, audio, shorts — all supported.",
    url: "https://saveit.app/youtube",
  },
};

export default function Page() {
  return <YoutubeDownloader />;
}
