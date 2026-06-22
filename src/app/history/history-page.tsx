"use client";
import { useState } from "react";
import DownloaderShell from "@/components/downloader-shell";
import Spinner from "@/components/ui/spinner";
import { useDownloadHistory } from "@/core/hooks/use-download-history";
import type { DownloadHistoryEntry } from "@/core/hooks/use-download-history";

const PLATFORM_COLORS: Record<string, { badge: string; gradient: string }> = {
  youtube: {
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    gradient: "from-red-500 to-orange-500",
  },
  tiktok: {
    badge: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    gradient: "from-pink-500 to-cyan-400",
  },
  instagram: {
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    gradient: "from-yellow-400 via-pink-500 to-purple-600",
  },
  facebook: {
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gradient: "from-blue-500 to-blue-600",
  },
  twitter: {
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    gradient: "from-sky-400 to-blue-500",
  },
  threads: {
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-400/20",
    gradient: "from-zinc-100 to-zinc-400",
  },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function groupByDate(entries: DownloadHistoryEntry[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: DownloadHistoryEntry[] }[] = [];
  const buckets: Record<string, DownloadHistoryEntry[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  for (const entry of entries) {
    const d = new Date(entry.timestamp);
    if (d >= today) buckets["Today"].push(entry);
    else if (d >= yesterday) buckets["Yesterday"].push(entry);
    else if (d >= weekAgo) buckets["This Week"].push(entry);
    else buckets["Older"].push(entry);
  }

  for (const [label, items] of Object.entries(buckets)) {
    if (items.length > 0) groups.push({ label, items });
  }
  return groups;
}

export default function HistoryPage() {
  const { entries, removeEntry, clearHistory, hydrated } =
    useDownloadHistory();
  const [confirmClear, setConfirmClear] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter
    ? entries.filter((e) => e.platform === filter)
    : entries;
  const groups = groupByDate(filtered);

  const platformCounts = entries.reduce(
    (acc, e) => {
      acc[e.platform] = (acc[e.platform] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <DownloaderShell
      accentClass="text-indigo-400"
      glowClass="bg-indigo-600/5"
      borderGlow="border-indigo-500/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h1 className="font-syne text-xl font-700 text-white">
              Download History
            </h1>
            <p className="text-xs text-zinc-500">
              {entries.length} download{entries.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>
        {entries.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Clear all?</span>
                <button
                  onClick={() => {
                    clearHistory();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-zinc-500 text-xs font-medium border border-white/6 hover:bg-white/8 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-zinc-500 text-xs font-medium border border-white/6 hover:bg-white/8 hover:text-zinc-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Platform filter */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              filter === null
                ? "border-indigo-500/50 bg-indigo-500/10 text-white"
                : "border-white/6 text-zinc-500 hover:border-white/12"
            }`}
          >
            All ({entries.length})
          </button>
          {Object.entries(platformCounts).map(([platform, count]) => {
            const colors =
              PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.youtube;
            return (
              <button
                key={platform}
                onClick={() => setFilter(platform)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize ${
                  filter === platform
                    ? `${colors.badge} font-600`
                    : "border-white/6 text-zinc-500 hover:border-white/12"
                }`}
              >
                {platform} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {hydrated && entries.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <div className="text-5xl">📥</div>
          <div>
            <p className="font-syne font-600 text-white text-lg">
              No downloads yet
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              Your download history will appear here.
            </p>
          </div>
          <a
            href="/youtube"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-syne font-600 hover:opacity-90 transition-opacity"
          >
            Start downloading
          </a>
        </div>
      )}

      {/* Loading state */}
      {!hydrated && (
        <div className="text-center py-16">
          <Spinner />
        </div>
      )}

      {/* History groups */}
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="text-xs text-zinc-600 font-medium uppercase tracking-wider px-1">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((entry) => {
              const colors =
                PLATFORM_COLORS[entry.platform] ?? PLATFORM_COLORS.youtube;
              return (
                <div
                  key={entry.id}
                  className="glass rounded-2xl border border-white/6 p-3 flex items-center gap-3 hover:border-white/10 transition-colors"
                >
                  {/* Thumbnail */}
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt=""
                      className="w-14 h-10 object-cover rounded-lg flex-shrink-0 bg-zinc-900"
                    />
                  ) : (
                    <div
                      className={`w-14 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br ${colors.gradient} opacity-20`}
                    />
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium line-clamp-1">
                      {entry.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize ${colors.badge}`}
                      >
                        {entry.platform}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {entry.quality}
                      </span>
                      <span className="text-[10px] text-zinc-700">
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Open original"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* No filtered results */}
      {hydrated && entries.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10">
          <p className="text-zinc-500 text-sm">
            No downloads for this platform.
          </p>
        </div>
      )}
    </DownloaderShell>
  );
}
