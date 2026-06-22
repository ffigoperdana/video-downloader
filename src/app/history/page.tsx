import type { Metadata } from "next";
import HistoryPage from "./history-page";

export const metadata: Metadata = {
  title: "Download History",
  description:
    "View and manage your download history. Re-download past videos from YouTube, TikTok, Instagram, Facebook, X, and Threads.",
  alternates: { canonical: "https://saveit.app/history" },
};

export default function Page() {
  return <HistoryPage />;
}
