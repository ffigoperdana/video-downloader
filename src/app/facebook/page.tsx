import type { Metadata } from "next";
import FacebookDownloader from "./facebook-downloader";

export const metadata: Metadata = {
  title: "Facebook Video Downloader — Reels & Videos, Free",
  description:
    "Download Facebook videos, reels, and stories in HD quality. Free, fast, no login required. Save Facebook videos to your device.",
  keywords: [
    "facebook downloader",
    "download facebook video",
    "facebook reel download",
    "facebook video saver",
    "fb video download",
  ],
  alternates: { canonical: "https://saveit.app/facebook" },
  openGraph: {
    title: "Facebook Downloader — Free Video Download",
    description:
      "Download Facebook videos and reels in HD quality. Free and no login required.",
    url: "https://saveit.app/facebook",
  },
};

export default function Page() {
  return <FacebookDownloader />;
}
