"use client";
import { useState, useTransition } from "react";
import DownloaderShell from "@/components/downloader-shell";
import Spinner from "@/components/ui/spinner";
import {
  getVideoInfoAction,
  prepareDownloadAction,
} from "@/actions/youtube-downloader.action";
import type { VideoInfo, VideoFormat } from "@/core/services/youtube.service";
import { fmtDuration, fmtBytes, fmtCount } from "@/core/utils/format-helpers";
import { useDownloadHistory } from "@/core/hooks/use-download-history";

const QUALITY_PRESETS = [
  { value: "best", label: "Best", sub: "Auto", fast: true },
  { value: "1080p", label: "1080p", sub: "HD", fast: false },
  { value: "720p", label: "720p", sub: "HD", fast: true },
  { value: "480p", label: "480p", sub: "SD", fast: true },
  { value: "360p", label: "360p", sub: "Low", fast: true },
  { value: "audio", label: "Audio", sub: "MP3", fast: true },
];

export default function YoutubeDownloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState("best");
  const [formatId, setFormatId] = useState<string | undefined>();
  const [downloading, setDownloading] = useState(false);
  const [isPending, start] = useTransition();
  const { addEntry } = useDownloadHistory();

  const loading = isPending || downloading;

  const handleFetch = () => {
    setError(null);
    setInfo(null);
    setFormatId(undefined);
    start(async () => {
      const r = await getVideoInfoAction(url);
      if (r.success && r.data) setInfo(r.data);
      else setError(r.error ?? "Unknown error");
    });
  };

  const handleDownload = () => {
    if (!info) return;
    setError(null);
    setDownloading(true);
    start(async () => {
      const r = await prepareDownloadAction(url, quality, info.title, formatId);
      if (!r.success || !r.downloadPath) {
        setError(r.error ?? "Failed");
        setDownloading(false);
        return;
      }
      const a = document.createElement("a");
      a.href = r.downloadPath;
      a.download = r.filename ?? "video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addEntry({
        url,
        platform: "youtube",
        title: info.title,
        thumbnail: info.thumbnail,
        quality,
        filename: r.filename ?? "video.mp4",
        status: "completed",
      });
      setDownloading(false);
    });
  };

  const videoFormats = info?.formats.filter((f) => f.vcodec !== "none") ?? [];

  return (
    <DownloaderShell
      accentClass="text-red-400"
      glowClass="bg-red-600/5"
      borderGlow="border-red-500/10"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <div>
            <h1 className="font-syne text-xl font-700 text-white">
              YouTube Downloader
            </h1>
            <p className="text-xs text-zinc-500">
              Up to 1080p HD · Audio · Shorts
            </p>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity pointer-events-none" />
        <div className="relative flex gap-2 glass rounded-2xl p-2 border border-white/6 group-focus-within:border-red-500/30 transition-colors">
          <input
            type="url"
            placeholder="Paste YouTube URL..."
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
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-syne font-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-red-500/20 flex-shrink-0"
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

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm">
          <span className="text-base flex-shrink-0">⚠</span> {error}
        </div>
      )}

      {info && (
        <div className="glass rounded-3xl border border-white/6 overflow-hidden space-y-5 p-5">
          <div className="flex gap-4">
            {info.thumbnail && (
              <img
                src={info.thumbnail}
                alt=""
                className="w-32 h-[72px] object-cover rounded-xl flex-shrink-0 bg-zinc-900"
              />
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

          <div className="space-y-2">
            <p className="text-xs text-zinc-600 font-medium uppercase tracking-wider">
              Quality
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {QUALITY_PRESETS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => {
                    setQuality(q.value);
                    setFormatId(undefined);
                  }}
                  className={`relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition-all ${
                    quality === q.value && !formatId
                      ? "border-red-500/50 bg-red-500/10 text-white"
                      : "border-white/6 text-zinc-500 hover:border-white/12 hover:text-zinc-300"
                  }`}
                >
                  <span className="text-xs font-syne font-600">{q.label}</span>
                  <span className="text-[9px] opacity-60">{q.sub}</span>
                  {!q.fast && (
                    <span className="absolute -top-px -right-px text-[8px] bg-amber-500/80 text-black font-600 px-1 rounded-bl rounded-tr-xl leading-4">
                      slow
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {videoFormats.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400 transition-colors list-none flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3 group-open:rotate-90 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                Advanced: pick specific format
              </summary>
              <div className="mt-2 max-h-44 overflow-y-auto space-y-1 pr-1">
                {videoFormats.slice(0, 20).map((f) => (
                  <button
                    key={f.format_id}
                    onClick={() => setFormatId(f.format_id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition-colors ${
                      formatId === f.format_id
                        ? "border-red-500/40 bg-red-500/8 text-white"
                        : "border-white/4 text-zinc-500 hover:border-white/8"
                    }`}
                  >
                    <span className="font-mono text-zinc-400 w-14 flex-shrink-0">
                      {f.format_id}
                    </span>
                    <span className="text-white">{f.resolution}</span>
                    {f.fps && <span className="text-zinc-600">{f.fps}fps</span>}
                    <span className="text-zinc-700">.{f.ext}</span>
                    {fmtBytes(f.filesize) && (
                      <span className="text-zinc-700 ml-auto">
                        {fmtBytes(f.filesize)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </details>
          )}

          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-syne font-600 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
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
                Download {formatId ? `format ${formatId}` : quality}
              </>
            )}
          </button>
        </div>
      )}
    </DownloaderShell>
  );
}
