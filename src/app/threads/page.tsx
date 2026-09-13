import type { Metadata } from "next";
import ThreadsDownloader from "./threads-downloader";

export const metadata: Metadata = {
  title: "Threads Video Downloader — Free, threads.com",
  description:
    "Download videos from Threads (threads.com). Free, fast, no login required. Experimental support.",
  keywords: [
    "threads downloader",
    "download threads video",
    "threads.com downloader",
    "threads video saver",
  ],
  alternates: { canonical: "/threads" },
  openGraph: {
    title: "Threads Video Downloader — Free",
    description:
      "Download videos from Threads. Free and no login required.",
    url: "/threads",
  },
};

export default function Page() {
  return <ThreadsDownloader />;
}
