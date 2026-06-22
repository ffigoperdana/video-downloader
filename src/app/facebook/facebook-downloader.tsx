"use client";
import { useState, useTransition } from "react";
import DownloaderShell from "@/components/downloader-shell";
import Spinner from "@/components/ui/spinner";
import {
  getFacebookInfoAction,
  prepareFacebookDownloadAction,
} from "@/actions/facebook-downloader.action";
import type { FacebookVideoInfo } from "@/core/services/facebook.service";
import { fmtDuration, fmtBytes, fmtCount } from "@/core/utils/format-helpers";
import { useDownloadHistory } from "@/core/hooks/use-download-history";

const QUALITY_PRESETS = [
  { value: "best", label: "Best", sub: "Auto", fast: true },
  { value: "720p", label: "720p", sub: "HD", fast: true },
  { value: "480p", label: "480p", sub: "SD", fast: true },
  { value: "360p", label: "360p", sub: "Low", fast: true },
  { value: "audio", label: "Audio", sub: "MP3", fast: true },
];

export default function FacebookDownloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<FacebookVideoInfo | null>(null);
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
      const r = await getFacebookInfoAction(url);
      if (r.success && r.data) setInfo(r.data);
      else setError(r.error ?? "Unknown error");
    });
  };

  const handleDownload = () => {
    if (!info) return;
    setError(null);
    setDownloading(true);
    start(async () => {
      const r = await prepareFacebookDownloadAction(
        url,
        quality,
        info.title,
      );
      if (!r.success || !r.downloadPath) {
        setError(r.error ?? "Failed");
        setDownloading(false);
        return;
      }
      const a = document.createElement("a");
      a.href = r.downloadPath;
      a.download = r.filename ?? "facebook.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addEntry({
        url,
        platform: "facebook",
        title: info.title,
        thumbnail: info.thumbnail,
        quality,
        filename: r.filename ?? "facebook.mp4",
        status: "completed",
      });
      setDownloading(false);
    });
  };

  const videoFormats = info?.formats.filter((f) => f.vcodec !== "none") ?? [];

  return (
    <DownloaderShell
      accentClass="text-blue-400"
      glowClass="bg-blue-600/5"
      borderGlow="border-blue-500/10"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
        <div>
          <h1 className="font-syne text-xl font-700 text-white">
            Facebook Downloader
          </h1>
          <p className="text-xs text-zinc-500">
            Videos · Reels · Stories · HD quality
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="relative group">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity pointer-events-none" />
        <div className="relative flex gap-2 glass rounded-2xl p-2 border border-white/6 group-focus-within:border-blue-500/30 transition-colors">
          <input
            type="url"
            placeholder="Paste Facebook URL..."
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
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-syne font-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-blue-500/20 flex-shrink-0"
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
        facebook.com · fb.watch · Public content only
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
              <div className="w-32 h-[72px] rounded-xl flex-shrink-0 flex items-center justify-center bg-blue-500/10">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-zinc-700">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
            )}
            <div className="min-w-0 space-y-1.5">
              <p className="font-syne font-600 text-white text-sm leading-snug line-clamp-2">
                {info.title}
              </p>
              <p className="text-xs text-zinc-500">{info.uploader}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                {info.duration > 0 && <span>{fmtDuration(info.duration)}</span>}
                {info.view_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{fmtCount(info.view_count)} views</span>
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
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {QUALITY_PRESETS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition-all ${
                    quality === q.value
                      ? "border-blue-500/50 bg-blue-500/10 text-white"
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
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-syne font-600 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
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
