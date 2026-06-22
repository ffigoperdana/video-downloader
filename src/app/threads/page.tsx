import type { Metadata } from "next";
import ThreadsDownloader from "./threads-downloader";

export const metadata: Metadata = {
  title: "Threads Video Downloader — Free, threads.net",
  description:
    "Download videos from Threads (threads.net). Free, fast, no login required. Experimental support.",
  keywords: [
    "threads downloader",
    "download threads video",
    "threads.net downloader",
    "threads video saver",
  ],
  alternates: { canonical: "https://saveit.app/threads" },
  openGraph: {
    title: "Threads Video Downloader — Free",
    description:
      "Download videos from Threads. Free and no login required.",
    url: "https://saveit.app/threads",
  },
};

export default function Page() {
  return <ThreadsDownloader />;
}
