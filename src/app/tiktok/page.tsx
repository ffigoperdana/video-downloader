import type { Metadata } from "next";
import TikTokDownloader from "./tiktok-downloader";

export const metadata: Metadata = {
  title: "TikTok Video Downloader — No Watermark, Free",
  description:
    "Download TikTok videos without watermark in HD quality. Free, instant, no login. Save TikTok videos to your device.",
  keywords: [
    "tiktok downloader",
    "download tiktok no watermark",
    "tiktok video saver",
    "tiktok to mp4",
  ],
  alternates: { canonical: "/tiktok" },
  openGraph: {
    title: "TikTok Downloader — No Watermark Free",
    description:
      "Download TikTok videos without watermark instantly. Free and no login required.",
    url: "/tiktok",
  },
};

export default function Page() {
  return <TikTokDownloader />;
}
