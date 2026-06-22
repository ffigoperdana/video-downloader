"use client";
import { useState, useTransition } from "react";
import DownloaderShell from "@/components/downloader-shell";
import Spinner from "@/components/ui/spinner";
import {
  getTwitterInfoAction,
  prepareTwitterDownloadAction,
} from "@/actions/twitter-downloader.action";
import type { TwitterVideoInfo } from "@/core/services/twitter.service";
import { fmtDuration, fmtBytes, fmtCount } from "@/core/utils/format-helpers";
import { useDownloadHistory } from "@/core/hooks/use-download-history";

const QUALITY_PRESETS = [
  { value: "best", label: "Best", sub: "Auto", fast: true },
  { value: "720p", label: "720p", sub: "HD", fast: true },
  { value: "480p", label: "480p", sub: "SD", fast: true },
  { value: "audio", label: "Audio", sub: "MP3", fast: true },
];

export default function TwitterDownloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<TwitterVideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState("best");
  const [downloading, setDownloading] = useState(false);
  const [isPending, start] = useTransition();
  const loading = isPending || downloading;
  const { addEntry } = useDownloadHistory();

  const handleFetch = () => {
    setError(null);
    setInfo(null);
    start(async () => {
      const r = await getTwitterInfoAction(url);
      if (r.success && r.data) setInfo(r.data);
      else setError(r.error ?? "Unknown error");
    });
  };

  const handleDownload = () => {
    if (!info) return;
    setError(null);
    setDownloading(true);
    start(async () => {
      const r = await prepareTwitterDownloadAction(url, quality, info.title);
      if (!r.success || !r.downloadPath) {
        setError(r.error ?? "Failed");
        setDownloading(false);
        return;
      }
      const a = document.createElement("a");
      a.href = r.downloadPath;
      a.download = r.filename ?? "twitter.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addEntry({
        url,
        platform: "twitter",
        title: info.title,
        thumbnail: info.thumbnail,
        quality,
        filename: r.filename ?? "twitter.mp4",
        status: "completed",
      });
      setDownloading(false);
    });
  };

  const videoFormats = info?.formats.filter((f) => f.vcodec !== "none") ?? [];

  return (
    <DownloaderShell
      accentClass="text-sky-400"
      glowClass="bg-sky-600/5"
      borderGlow="border-sky-500/10"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <div>
          <h1 className="font-syne text-xl font-700 text-white">
            X / Twitter Downloader
          </h1>
          <p className="text-xs text-zinc-500">
            Videos · GIFs · HD quality
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="relative group">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-400/10 to-blue-500/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity pointer-events-none" />
        <div className="relative flex gap-2 glass rounded-2xl p-2 border border-white/6 group-focus-within:border-sky-500/30 transition-colors">
          <input
            type="url"
            placeholder="Paste X / Twitter post URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !loading && url.trim() && handleFetch()
            }
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none"
          />
          <button
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white text-sm font-syne font-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-sky-500/20 flex-shrink-0"
          >
            {isPending && !downloading ? (
              <span className="flex items-center gap-1.5">
                <Spinner /> Fetching
              </span>
            ) : (
              "Fetch"
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-700 text-center">
        x.com · twitter.com/user/status/ID
      </p>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm">
          <span className="flex-shrink-0">⚠</span> {error}
        </div>
      )}

      {info && (
        <div className="glass rounded-3xl border border-white/6 overflow-hidden space-y-5 p-5">
          <div className="flex gap-4">
            {info.thumbnail ? (
              <img
                src={info.thumbnail}
                alt=""
                className="w-32 h-[72px] object-cover rounded-xl flex-shrink-0 bg-zinc-900"
              />
            ) : (
              <div className="w-32 h-[72px] rounded-xl flex-shrink-0 flex items-center justify-center bg-sky-500/10">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-zinc-700">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            )}
            <div className="min-w-0 space-y-1.5">
              <p className="font-syne font-600 text-white text-sm leading-snug line-clamp-2">
                {info.title}
              </p>
              <p className="text-sky-400 text-sm font-medium">
                @{info.uploader_id || info.uploader}
              </p>
              {info.description && (
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                  {info.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                {info.duration > 0 && <span>{fmtDuration(info.duration)}</span>}
                {info.view_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{fmtCount(info.view_count)} views</span>
                  </>
                )}
                {info.like_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{fmtCount(info.like_count)} likes</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 font-medium uppercase tracking-wider">
              Quality
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {QUALITY_PRESETS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition-all ${
                    quality === q.value
                      ? "border-sky-500/50 bg-sky-500/10 text-white"
                      : "border-white/6 text-zinc-500 hover:border-white/12 hover:text-zinc-300"
                  }`}
                >
                  <span className="text-xs font-syne font-600">{q.label}</span>
                  <span className="text-[9px] opacity-60">{q.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-syne font-600 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <Spinner /> Preparing download...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="currentColor"
                >
                  <path d="M12 16l-6-6h4V4h4v6h4l-6 6zm-7 2h14v2H5v-2z" />
                </svg>
                Download {quality === "audio" ? "Audio" : quality}
              </>
            )}
          </button>
        </div>
      )}
    </DownloaderShell>
  );
}
