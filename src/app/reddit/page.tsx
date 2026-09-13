import type { Metadata } from "next";
import RedditDownloader from "./reddit-downloader";

export const metadata: Metadata = {
  title: "Reddit Video & Image Downloader — Free",
  description:
    "Download public Reddit videos with audio, image posts, and galleries. Free and no login required.",
  keywords: [
    "reddit downloader",
    "download reddit video",
    "reddit image downloader",
    "reddit gallery downloader",
    "save reddit video with audio",
  ],
  alternates: { canonical: "https://saveit.app/reddit" },
  openGraph: {
    title: "Reddit Video & Image Downloader — Free",
    description:
      "Download public Reddit videos, image posts, and galleries with SaveIt.",
    url: "https://saveit.app/reddit",
  },
};

export default function Page() {
  return <RedditDownloader />;
}
