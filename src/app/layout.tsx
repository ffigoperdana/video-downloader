import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans } from "next/font/google";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import OfflineIndicator from "@/components/offline-indicator";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://saveit.app"),
  title: {
    default: "SaveIt — Download YouTube, TikTok, Instagram, Facebook, X & Threads Videos Free",
    template: "%s | SaveIt",
  },
  description:
    "Download videos from YouTube, TikTok, Instagram, Facebook, X (Twitter), and Threads in seconds. No watermark, high quality MP4, free and no registration required. Batch downloads, download history, PWA support.",
  keywords: [
    "video downloader",
    "youtube downloader",
    "tiktok downloader",
    "instagram downloader",
    "facebook downloader",
    "twitter video downloader",
    "x video downloader",
    "threads downloader",
    "download youtube video",
    "download tiktok no watermark",
    "download instagram reel",
    "batch download",
    "free video downloader",
    "mp4 downloader",
    "online video downloader",
    "pwa video downloader",
  ],
  authors: [{ name: "SaveIt" }],
  creator: "SaveIt",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://saveit.app",
    siteName: "SaveIt",
    title: "SaveIt — Download YouTube, TikTok, Instagram, Facebook, X & Threads Videos Free",
    description:
      "Download videos from YouTube, TikTok, Instagram, Facebook, X, and Threads in seconds. No watermark, high quality, free. Batch downloads, download history.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SaveIt Video Downloader",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SaveIt — Download YouTube, TikTok, Instagram, Facebook, X & Threads Videos Free",
    description:
      "Download videos from YouTube, TikTok, Instagram, Facebook, X, and Threads in seconds.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SaveIt",
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
};

const SW_REGISTER = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function() {});
  });
}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
      </head>
      <body className="bg-[#080808] text-white antialiased font-dm">
        <OfflineIndicator />
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
