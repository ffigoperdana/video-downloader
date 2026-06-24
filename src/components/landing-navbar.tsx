import Link from "next/link";

const NAV_LINKS = [
  { href: "/youtube", label: "YouTube" },
  { href: "/tiktok", label: "TikTok" },
  { href: "/instagram", label: "Instagram" },
  { href: "/facebook", label: "Facebook" },
  { href: "/twitter", label: "X" },
  { href: "/threads", label: "Threads" },
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
                className="px-3 py-1.5 rounded-xl text-sm font-medium border border-transparent text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
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
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}
