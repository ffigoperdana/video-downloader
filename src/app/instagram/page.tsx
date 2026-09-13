import type { Metadata } from "next";
import InstagramDownloader from "./instagram-downloader";

export const metadata: Metadata = {
  title: "Instagram Video Downloader — Reels, Posts, Carousels",
  description:
    "Download Instagram Reels, posts, IGTV and carousel videos in original quality. Free, no login, supports all public content.",
  keywords: [
    "instagram downloader",
    "download instagram reel",
    "instagram video saver",
    "save instagram post",
    "instagram to mp4",
  ],
  alternates: { canonical: "/instagram" },
  openGraph: {
    title: "Instagram Downloader — Reels & Posts Free",
    description:
      "Download Instagram videos in original quality. Reels, posts, carousels — all supported.",
    url: "/instagram",
  },
};

export default function Page() {
  return <InstagramDownloader />;
}
