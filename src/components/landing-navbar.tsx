import Link from "next/link";

const NAV_LINKS = [
  {
    href: "/youtube",
    label: "YouTube",
    accent: "hover:text-red-400 hover:border-red-500/50",
    dot: "bg-red-500",
  },
  {
    href: "/tiktok",
    label: "TikTok",
    accent: "hover:text-pink-400 hover:border-pink-500/50",
    dot: "bg-pink-500",
  },
  {
    href: "/instagram",
    label: "Instagram",
    accent: "hover:text-purple-400 hover:border-purple-500/50",
    dot: "bg-purple-500",
  },
  {
    href: "/facebook",
    label: "Facebook",
    accent: "hover:text-blue-400 hover:border-blue-500/50",
    dot: "bg-blue-500",
  },
  {
    href: "/twitter",
    label: "X",
    accent: "hover:text-sky-400 hover:border-sky-500/50",
    dot: "bg-sky-500",
  },
  {
    href: "/threads",
    label: "Threads",
    accent: "hover:text-zinc-300 hover:border-zinc-400/50",
    dot: "bg-zinc-400",
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-white"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <span className="font-syne font-700 text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
        SaveIt
      </span>
    </Link>
  );
}

export default function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center justify-between">
          <Logo />

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-transparent text-zinc-400 ${item.accent} transition-all duration-200`}
              >
                <span className={`w-1.5 h-1.5 rounded-full opacity-40 ${item.dot}`} />
                <span>{item.label}</span>
              </Link>
            ))}
            <Link
              href="/history"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-transparent text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all duration-200"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>History</span>
            </Link>
          </div>

          <details className="relative md:hidden">
            <summary
              aria-label="Open navigation menu"
              className="list-none cursor-pointer p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-3 w-56 rounded-2xl glass border border-white/6 p-2 shadow-2xl shadow-black/40">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <span>{item.label}</span>
                </Link>
              ))}
              <div className="h-px bg-white/5 my-1" />
              <Link
                href="/history"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>History</span>
              </Link>
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}
