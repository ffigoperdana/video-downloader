"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDownloadHistory } from "@/core/hooks/use-download-history";

const NAV_ITEMS = [
  {
    href: "/youtube",
    label: "YouTube",
    accent: "hover:text-red-400 hover:border-red-500/50",
    dot: "bg-red-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    href: "/tiktok",
    label: "TikTok",
    accent: "hover:text-pink-400 hover:border-pink-500/50",
    dot: "bg-pink-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
  },
  {
    href: "/instagram",
    label: "Instagram",
    accent: "hover:text-purple-400 hover:border-purple-500/50",
    dot: "bg-purple-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    href: "/facebook",
    label: "Facebook",
    accent: "hover:text-blue-400 hover:border-blue-500/50",
    dot: "bg-blue-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    href: "/twitter",
    label: "X",
    accent: "hover:text-sky-400 hover:border-sky-500/50",
    dot: "bg-sky-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: "/threads",
    label: "Threads",
    accent: "hover:text-zinc-300 hover:border-zinc-400/50",
    dot: "bg-zinc-400",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.83-1.82-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.217-3.259-.785a4.96 4.96 0 01-2.039-2.696c-.196-.996-.164-2.068.093-3.15.304-1.267.87-2.374 1.674-3.273 1.058-1.183 2.527-1.977 4.186-2.164.942-.107 1.888-.059 2.79.14.863.193 1.65.536 2.326 1.01V9.63c0-.543.358-.905.882-.905h.044c.528 0 .887.362.887.905v4.09c0 .543-.358.905-.887.905h-2.41c-.528 0-.887-.362-.887-.905v-.798c-1.744 1.338-4.028 1.79-6.277 1.264-1.586-.376-2.839-1.23-3.57-2.482-.77-1.326-1.017-2.872-.713-4.482.398-2.1 1.626-3.875 3.5-5.126 1.753-1.179 3.855-1.687 5.962-1.444 2.284.265 4.35 1.334 5.892 3.045 1.34 1.488 2.148 3.378 2.358 5.485.088.88.076 1.745-.034 2.575.404.262.746.587 1.015.973.567.815.883 1.784.942 2.873.11 2.024-.536 3.756-1.86 5.01-1.45 1.373-3.51 2.164-6.35 2.324z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { entries, hydrated } = useDownloadHistory();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <span className="font-syne font-700 text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              SaveIt
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200
                  ${
                    isActive(item.href)
                      ? "bg-white/8 border-white/10 text-white"
                      : `border-transparent text-zinc-400 ${item.accent}`
                  }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.dot} ${isActive(item.href) ? "opacity-100" : "opacity-40"}`} />
                <span>{item.label}</span>
              </Link>
            ))}
            <Link
              href="/history"
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200
                ${isActive("/history") ? "bg-white/8 border-white/10 text-white" : "border-transparent text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/50"}`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>History</span>
              {hydrated && entries.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-indigo-500 text-white rounded-full px-1">
                  {entries.length > 99 ? "99+" : entries.length}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="md:hidden glass rounded-2xl mt-2 p-2 border border-white/6 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive(item.href) ? "bg-white/8 text-white" : "text-zinc-400 hover:bg-white/4 hover:text-white"}`}
              >
                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="h-px bg-white/5 my-1" />
            <Link
              href="/history"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive("/history") ? "bg-white/8 text-white" : "text-zinc-400 hover:bg-white/4 hover:text-white"}`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>History</span>
              {hydrated && entries.length > 0 && (
                <span className="ml-auto text-[10px] bg-indigo-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                  {entries.length > 99 ? "99+" : entries.length}
                </span>
              )}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
