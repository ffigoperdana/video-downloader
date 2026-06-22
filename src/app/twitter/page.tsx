import type { Metadata } from "next";
import TwitterDownloader from "./twitter-downloader";

export const metadata: Metadata = {
  title: "X (Twitter) Video Downloader — Free, HD Quality",
  description:
    "Download X (Twitter) videos in HD quality. Free, fast, no login required. Save X/Twitter videos and GIFs to your device.",
  keywords: [
    "twitter video downloader",
    "x video downloader",
    "download twitter video",
    "download x video",
    "twitter to mp4",
  ],
  alternates: { canonical: "https://saveit.app/twitter" },
  openGraph: {
    title: "X (Twitter) Video Downloader — Free",
    description:
      "Download X and Twitter videos in HD quality. Free and no login required.",
    url: "https://saveit.app/twitter",
  },
};

export default function Page() {
  return <TwitterDownloader />;
}
