import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "SaveIt — Free Video & Image Downloader",
  description:
    "Download public videos and images from YouTube, TikTok, Instagram, Facebook, X, and Threads for free.",
  alternates: { canonical: "https://saveit.app" },
};

const PLATFORMS = [
  {
    href: "/youtube",
    name: "YouTube",
    tagline: "Up to 1080p HD",
    description:
      "Download any YouTube video, shorts, or playlist item. Choose between quality presets from 360p to full 1080p HD.",
    accent: "from-red-500 to-orange-500",
    border: "border-red-500/20 hover:border-red-500/50",
    glow: "hover:shadow-red-500/10",
    bg: "from-red-500/8 to-transparent",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    features: [
      "No ads or tracking",
      "720p & 1080p HD",
      "Audio-only MP3",
      "Shorts supported",
    ],
  },
  {
    href: "/tiktok",
    name: "TikTok",
    tagline: "Videos & Photo Posts",
    description:
      "Save TikTok videos without watermark and download every image from public photo posts.",
    accent: "from-pink-500 to-cyan-400",
    border: "border-pink-500/20 hover:border-pink-500/50",
    glow: "hover:shadow-pink-500/10",
    bg: "from-pink-500/8 to-transparent",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
    features: [
      "Zero watermark",
      "HD video quality",
      "Audio extraction",
      "Photo posts",
    ],
  },
  {
    href: "/instagram",
    name: "Instagram",
    tagline: "Reels, Photos & Carousels",
    description:
      "Download Instagram Reels, feed photos, IGTV, and image or video carousel slides.",
    accent: "from-yellow-400 via-pink-500 to-purple-600",
    border: "border-purple-500/20 hover:border-purple-500/50",
    glow: "hover:shadow-purple-500/10",
    bg: "from-purple-500/8 to-transparent",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    features: [
      "Reels & feed posts",
      "Photo carousels",
      "IGTV videos",
      "Original quality",
    ],
  },
  {
    href: "/facebook",
    name: "Facebook",
    tagline: "Videos, Reels & Photos",
    description:
      "Download public Facebook videos, reels, and image posts in their available quality.",
    accent: "from-blue-500 to-blue-600",
    border: "border-blue-500/20 hover:border-blue-500/50",
    glow: "hover:shadow-blue-500/10",
    bg: "from-blue-500/8 to-transparent",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    features: [
      "Videos & reels",
      "HD quality",
      "fb.watch links",
      "Public image posts",
    ],
  },
  {
    href: "/twitter",
    name: "X",
    tagline: "Videos, GIFs & Images",
    description:
      "Download videos, GIFs, and original images from public X or Twitter posts.",
    accent: "from-sky-400 to-blue-500",
    border: "border-sky-500/20 hover:border-sky-500/50",
    glow: "hover:shadow-sky-500/10",
    bg: "from-sky-500/8 to-transparent",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    features: [
      "X & Twitter posts",
      "Multiple bitrates",
      "GIF support",
      "Image posts",
    ],
  },
  {
    href: "/threads",
    name: "Threads",
    tagline: "Videos & Images",
    description:
      "Download videos and images from public Threads posts on threads.com.",
    accent: "from-zinc-100 to-zinc-400",
    border: "border-zinc-500/20 hover:border-zinc-400/50",
    glow: "hover:shadow-zinc-500/10",
    bg: "from-zinc-500/8 to-transparent",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.83-1.82-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.217-3.259-.785a4.96 4.96 0 01-2.039-2.696c-.196-.996-.164-2.068.093-3.15.304-1.267.87-2.374 1.674-3.273 1.058-1.183 2.527-1.977 4.186-2.164.942-.107 1.888-.059 2.79.14.863.193 1.65.536 2.326 1.01V9.63c0-.543.358-.905.882-.905h.044c.528 0 .887.362.887.905v4.09c0 .543-.358.905-.887.905h-2.41c-.528 0-.887-.362-.887-.905v-.798c-1.744 1.338-4.028 1.79-6.277 1.264-1.586-.376-2.839-1.23-3.57-2.482-.77-1.326-1.017-2.872-.713-4.482.398-2.1 1.626-3.875 3.5-5.126 1.753-1.179 3.855-1.687 5.962-1.444 2.284.265 4.35 1.334 5.892 3.045 1.34 1.488 2.148 3.378 2.358 5.485.088.88.076 1.745-.034 2.575.404.262.746.587 1.015.973.567.815.883 1.784.942 2.873.11 2.024-.536 3.756-1.86 5.01-1.45 1.373-3.51 2.164-6.35 2.324z" />
      </svg>
    ),
    features: [
      "Videos & images",
      "threads.com links",
      "Public posts",
      "Image galleries",
    ],
  },
];

const BENEFITS = [
  {
    icon: "⚡",
    title: "Lightning Fast",
    body: "Supported media starts downloading without an upload step or permanent server storage.",
  },
  {
    icon: "🚫",
    title: "Zero Watermarks",
    body: "TikTok downloads are completely clean, with no logo or username overlaid on your saved video.",
  },
  {
    icon: "🔒",
    title: "Private by Default",
    body: "We don't permanently store downloaded media. Your download history remains in your browser.",
  },
  {
    icon: "📱",
    title: "Works Everywhere",
    body: "Mobile, tablet, desktop — the interface adapts perfectly. Install as a PWA for native-like experience.",
  },
  {
    icon: "🆓",
    title: "Completely Free",
    body: "No account, no subscription, no credit card. Just paste the URL and hit download. Always.",
  },
  {
    icon: "📥",
    title: "Batch Downloads",
    body: "Download media from Instagram carousels and save each image from supported photo posts.",
  },
  {
    icon: "🕐",
    title: "Download History",
    body: "Your download history is saved locally so videos and images stay organized by date.",
  },
  {
    icon: "🎯",
    title: "6 Platforms",
    body: "Video, audio, and public image posts from six major platforms in one place.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Copy the URL",
    body: "Go to a supported platform and copy the link to a public video, reel, photo, or post.",
  },
  {
    step: "02",
    title: "Paste & Fetch",
    body: "Paste the URL into the matching downloader. SaveIt validates the platform and finds its available media.",
  },
  {
    step: "03",
    title: "Choose & Download",
    body: "Choose a video quality or download individual images directly to your device.",
  },
];

const FAQS = [
  {
    q: "Is SaveIt free to use?",
    a: "Yes, completely free. No sign-up, no subscription, no limits.",
  },
  {
    q: "Which platforms are supported?",
    a: "YouTube supports video and audio. TikTok, Instagram, Facebook, X, and Threads support public videos and image posts.",
  },
  {
    q: "Can I download TikTok videos without watermark?",
    a: "Yes. SaveIt uses the original source file before TikTok applies the watermark overlay, giving you a completely clean video.",
  },
  {
    q: "What's the maximum quality I can download from YouTube?",
    a: "Up to 1080p Full HD. For resolutions ≤720p the download is near-instant via CDN. 1080p requires server-side merging of separate video and audio streams.",
  },
  {
    q: "Can I download image posts and carousels?",
    a: "Yes. Public image posts are supported on TikTok, Instagram, Facebook, X, and Threads. Each discovered image has its own download button.",
  },
  {
    q: "Does SaveIt work on mobile?",
    a: "Yes. The site is fully responsive and works great on iOS and Android browsers. You can also install it as a Progressive Web App (PWA) for a native-like experience.",
  },
  {
    q: "Can I download private Instagram posts?",
    a: "No. SaveIt only works with publicly accessible content. Private accounts require authentication which we do not support.",
  },
  {
    q: "Do you store downloaded media?",
    a: "No. Videos and images are streamed to your browser and are not stored permanently. Download history stays in your browser.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] overflow-x-hidden">
      <Navbar />

      <main id="main-content">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[120px] animate-pulse-glow" />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[100px] animate-pulse-glow"
            style={{ animationDelay: "1.5s" }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          {/* Pill badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-zinc-400 border border-white/8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Free · No login · No watermark
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up delay-100 font-syne text-5xl sm:text-6xl md:text-7xl font-800 leading-[1.05] tracking-tight">
            Download videos & images
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              in seconds.
            </span>
          </h1>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
            Save videos, audio, and public image posts from six platforms in
            their available quality. No sign-up required.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-up delay-300 flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group flex items-center gap-2.5 px-5 py-3 rounded-2xl border ${p.border} bg-gradient-to-br ${p.bg} hover:shadow-xl ${p.glow} transition-all duration-300`}
              >
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center shadow-lg flex-shrink-0`}
                >
                  {p.icon}
                </div>
                <div className="text-left">
                  <div className="text-sm font-syne font-600 text-white">
                    {p.name}
                  </div>
                  <div className="text-xs text-zinc-400">{p.tagline}</div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Stats row */}
          <div className="animate-fade-up delay-400 flex items-center justify-center gap-8 pt-4">
            {[
              ["6 platforms", "supported"],
              ["1080p", "max quality"],
              ["0 seconds", "sign-up time"],
            ].map(([val, label]) => (
              <div key={val} className="text-center">
                <div className="font-syne text-xl font-700 text-white">
                  {val}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-zinc-400 sm:flex">
          <span className="text-xs">scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-zinc-700 to-transparent" />
        </div>
      </section>

      {/* ── PLATFORM CARDS ── */}
      <section className="relative px-4 py-24" id="platforms">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Supported Platforms
            </p>
            <h2 className="font-syne text-3xl sm:text-4xl font-700 text-white">
              Every major platform,{" "}
              <span className="text-zinc-400">covered.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLATFORMS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group relative rounded-3xl border ${p.border} bg-gradient-to-b ${p.bg} p-6 hover:shadow-2xl ${p.glow} transition-all duration-300 overflow-hidden`}
              >
                {/* Top glow */}
                <div
                  className={`absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r ${p.accent} opacity-50 group-hover:opacity-100 transition-opacity`}
                />

                <div className="space-y-5">
                  {/* Icon + name */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.accent} flex items-center justify-center shadow-lg`}
                    >
                      {p.icon}
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="font-syne text-xl font-700 text-white">
                      {p.name}
                    </h3>
                    <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Feature chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2.5 py-1 rounded-full bg-white/4 border border-white/6 text-zinc-400"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative px-4 py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Simple Process
            </p>
            <h2 className="font-syne text-3xl sm:text-4xl font-700 text-white">
              Three steps, <span className="text-zinc-400">that&apos;s it.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="hidden sm:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.step}
                className="relative group text-center sm:text-left space-y-4 p-6 rounded-2xl glass hover:bg-white/4 transition-colors duration-300"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/4 border border-white/8 font-syne font-800 text-2xl text-zinc-400 group-hover:text-white transition-colors">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-syne font-600 text-white text-lg">
                    {step.title}
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="px-4 py-24" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Why SaveIt
            </p>
            <h2 className="font-syne text-3xl sm:text-4xl font-700 text-white">
              Built different,{" "}
              <span className="text-zinc-400">on purpose.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group p-6 rounded-2xl border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 space-y-3"
              >
                <div className="text-3xl">{b.icon}</div>
                <h3 className="font-syne font-600 text-white">{b.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 py-24" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              FAQ
            </p>
            <h2 className="font-syne text-3xl sm:text-4xl font-700 text-white">
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group glass rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none hover:bg-white/3 transition-colors">
                  <span className="font-medium text-white text-sm pr-4">
                    {faq.q}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-zinc-400 flex-shrink-0 group-open:rotate-45 transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm text-zinc-400 leading-relaxed border-t border-white/5 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-4 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-600/20 to-violet-600/20 blur-xl" />
            <div className="relative glass rounded-3xl p-10 space-y-6 border border-white/8">
              <h2 className="font-syne text-3xl sm:text-4xl font-700 text-white leading-tight">
                Ready to save
                <br />
                your first download?
              </h2>
              <p className="text-zinc-400 text-sm">
                Pick a platform and paste your link. Takes less than 5 seconds.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {PLATFORMS.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${p.accent} text-white text-sm font-syne font-600 hover:opacity-90 transition-opacity shadow-lg`}
                  >
                    {p.name} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      </main>

      <footer className="px-4 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <span className="font-syne text-sm font-600 text-zinc-400">
              SaveIt
            </span>
          </div>
          <p className="text-xs text-zinc-400 text-center">
            For personal use only. Respect copyright laws and creators&apos; rights.
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <Link
              href="/youtube"
              className="hover:text-zinc-400 transition-colors"
            >
              YouTube
            </Link>
            <Link
              href="/tiktok"
              className="hover:text-zinc-400 transition-colors"
            >
              TikTok
            </Link>
            <Link
              href="/instagram"
              className="hover:text-zinc-400 transition-colors"
            >
              Instagram
            </Link>
            <Link
              href="/facebook"
              className="hover:text-zinc-400 transition-colors"
            >
              Facebook
            </Link>
            <Link
              href="/twitter"
              className="hover:text-zinc-400 transition-colors"
            >
              X
            </Link>
            <Link
              href="/threads"
              className="hover:text-zinc-400 transition-colors"
            >
              Threads
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
