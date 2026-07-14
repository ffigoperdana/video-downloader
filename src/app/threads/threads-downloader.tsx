"use client";
import { useState, useTransition } from "react";
import DownloaderShell from "@/components/downloader-shell";
import Spinner from "@/components/ui/spinner";
import SmartUrlInput from "@/components/smart-url-input";
import UrlValidationError from "@/components/url-validation-error";
import ImageMediaGallery from "@/components/image-media-gallery";
import BatchProgress from "@/components/batch-progress";
import {
  getThreadsInfoAction,
  prepareThreadsDownloadAction,
} from "@/actions/threads-downloader.action";
import type { ThreadsPostInfo } from "@/core/services/threads.service";
import { fmtDuration } from "@/core/utils/format-helpers";
import { useDownloadHistory } from "@/core/hooks/use-download-history";
import { useBatchDownload } from "@/core/hooks/use-batch-download";

export default function ThreadsDownloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<ThreadsPostInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [format, setFormat] = useState<"video" | "audio">("video");
  const [isPending, start] = useTransition();
  const { addEntry } = useDownloadHistory();
  const batch = useBatchDownload({
    onComplete: (item) => {
      addEntry({
        url: item.url,
        platform: "threads",
        title: item.title,
        thumbnail: info?.thumbnail ?? "",
        quality: format === "audio" ? "audio" : "best",
        filename: item.filename ?? `threads.${format === "audio" ? "mp3" : "mp4"}`,
        status: "completed",
      });
    },
  });
  const loading = isPending || downloading || batch.active;
  const hasThreadImages = (info?.images.length ?? 0) > 0;
  const directVideos = info?.videos ?? [];
  const isMixedPost = Boolean(info && !info.hasNoVideo && hasThreadImages);

  const handleUrlChange = (nextUrl: string) => {
    setUrl(nextUrl);
    setError(null);
    setInfo(null);
  };

  const handleFetch = () => {
    setError(null);
    setInfo(null);
    start(async () => {
      const r = await getThreadsInfoAction(url);
      if (r.success && r.data) setInfo(r.data);
      else setError(r.error ?? "Unknown error");
    });
  };

  const handleDownload = (videoIndex = 0) => {
    if (!info) return;
    setError(null);
    setDownloading(true);
    start(async () => {
      const title =
        directVideos.length > 1
          ? `${info.title}-video-${videoIndex + 1}`
          : info.title;
      const r = await prepareThreadsDownloadAction(url, title, format, videoIndex);
      if (!r.success || !r.downloadPath) {
        setError(r.error ?? "Failed");
        setDownloading(false);
        return;
      }
      batch.addToQueue([{
        url,
        title,
        filename: r.filename ?? `threads.${format === "audio" ? "mp3" : "mp4"}`,
        downloadPath: r.downloadPath,
      }]);
      setDownloading(false);
      void batch.startBatch();
    });
  };

  return (
    <DownloaderShell
      accentClass="text-zinc-300"
      glowClass="bg-zinc-600/5"
      borderGlow="border-zinc-500/10"
      batchSlot={
        <BatchProgress
          items={batch.items}
          active={batch.active}
          minimized={batch.minimized}
          onToggleMinimize={() => batch.setMinimized(!batch.minimized)}
          onCancel={batch.cancelAll}
          onRetryFailed={batch.retryFailed}
          onClearCompleted={batch.clearCompleted}
          completed={batch.completed}
          failed={batch.failed}
          total={batch.total}
        />
      }
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center shadow-lg shadow-zinc-500/20 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
            <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.83-1.82-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.217-3.259-.785a4.96 4.96 0 01-2.039-2.696c-.196-.996-.164-2.068.093-3.15.304-1.267.87-2.374 1.674-3.273 1.058-1.183 2.527-1.977 4.186-2.164.942-.107 1.888-.059 2.79.14.863.193 1.65.536 2.326 1.01V9.63c0-.543.358-.905.882-.905h.044c.528 0 .887.362.887.905v4.09c0 .543-.358.905-.887.905h-2.41c-.528 0-.887-.362-.887-.905v-.798c-1.744 1.338-4.028 1.79-6.277 1.264-1.586-.376-2.839-1.23-3.57-2.482-.77-1.326-1.017-2.872-.713-4.482.398-2.1 1.626-3.875 3.5-5.126 1.753-1.179 3.855-1.687 5.962-1.444 2.284.265 4.35 1.334 5.892 3.045 1.34 1.488 2.148 3.378 2.358 5.485.088.88.076 1.745-.034 2.575.404.262.746.587 1.015.973.567.815.883 1.784.942 2.873.11 2.024-.536 3.756-1.86 5.01-1.45 1.373-3.51 2.164-6.35 2.324z" />
          </svg>
        </div>
        <div>
          <h1 className="font-syne text-xl font-700 text-white">
            Threads Downloader
          </h1>
          <p className="text-xs text-zinc-500">
            Videos & images from threads.com
          </p>
        </div>
      </div>

      {/* Experimental warning */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400 text-xs">
        <span>🧪</span>
        <span>
          Threads support is experimental. Some posts may not be extractable.
        </span>
      </div>

      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-zinc-500/8 border border-zinc-500/20 text-zinc-400 text-xs leading-relaxed">
        <span aria-hidden="true">i</span>
        <span>
          Threads video and audio downloads now show progress in this page.
          If a download is interrupted, use Retry Failed in the progress panel.
        </span>
      </div>

      {/* Input */}
      <SmartUrlInput
        platformName="Threads"
        placeholder="Paste Threads URL..."
        value={url}
        onValueChange={handleUrlChange}
        onFetch={handleFetch}
        disabled={loading}
        fetching={isPending && !downloading}
        glowClassName="from-zinc-400/10 to-zinc-300/10"
        focusBorderClassName="group-focus-within:border-zinc-400/30"
        fetchButtonClassName="bg-gradient-to-r from-zinc-100 to-zinc-400 text-black shadow-zinc-500/20"
      />

      <p className="text-xs text-zinc-700 text-center">
        threads.com/@user/post/SHORTCODE
      </p>

      {error && (
        <UrlValidationError
          error={error}
          inputUrl={url}
          expectedPlatform="threads"
        />
      )}

      {info && (
        <div className="glass rounded-3xl border border-white/6 overflow-hidden space-y-5 p-5">
          <div className="flex gap-4">
            {info.thumbnail ? (
              <img
                src={info.thumbnail}
                alt=""
                className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-zinc-900"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center bg-zinc-500/10">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-zinc-700">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.83-1.82-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.217-3.259-.785a4.96 4.96 0 01-2.039-2.696c-.196-.996-.164-2.068.093-3.15.304-1.267.87-2.374 1.674-3.273 1.058-1.183 2.527-1.977 4.186-2.164.942-.107 1.888-.059 2.79.14.863.193 1.65.536 2.326 1.01V9.63c0-.543.358-.905.882-.905h.044c.528 0 .887.362.887.905v4.09c0 .543-.358.905-.887.905h-2.41c-.528 0-.887-.362-.887-.905v-.798c-1.744 1.338-4.028 1.79-6.277 1.264-1.586-.376-2.839-1.23-3.57-2.482-.77-1.326-1.017-2.872-.713-4.482.398-2.1 1.626-3.875 3.5-5.126 1.753-1.179 3.855-1.687 5.962-1.444 2.284.265 4.35 1.334 5.892 3.045 1.34 1.488 2.148 3.378 2.358 5.485.088.88.076 1.745-.034 2.575.404.262.746.587 1.015.973.567.815.883 1.784.942 2.873.11 2.024-.536 3.756-1.86 5.01-1.45 1.373-3.51 2.164-6.35 2.324z" />
                </svg>
              </div>
            )}
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/4 border border-white/6 text-zinc-500">
                  {isMixedPost
                    ? "Mixed media"
                    : info.hasNoVideo
                      ? "Image post"
                      : "Video"}
                </span>
              </div>
              <p className="text-zinc-300 font-medium text-sm">
                @{info.uploader_id || info.uploader}
              </p>
              {info.description && (
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                  {info.description}
                </p>
              )}
              <div className="flex gap-3 text-xs text-zinc-600">
                {info.duration > 0 && (
                  <span>⏱ {fmtDuration(info.duration)}</span>
                )}
              </div>
            </div>
          </div>

          {/* No video banner */}
          {info.hasNoVideo && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400 text-sm">
              <span className="text-xl">🖼</span>
              <div>
                <p className="font-semibold text-sm">Image-only post</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  This post has no downloadable video.
                </p>
              </div>
            </div>
          )}

          <ImageMediaGallery
            images={info.images}
            platformLabel="Threads"
            onQueueImageDownload={(image, format) => {
              const extension = format === "original" ? image.extension : format;
              const downloadPath =
                format === "original"
                  ? image.downloadPath
                  : `${image.downloadPath}&format=${format}`;
              batch.addToQueue([{
                url: downloadPath,
                title: `Threads image ${image.index + 1}`,
                filename: `threads-${image.index + 1}.${extension}`,
                downloadPath,
              }]);
              void batch.startBatch();
            }}
          />

          {directVideos.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Videos
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {directVideos.map((video) => (
                  <button
                    key={video.index}
                    type="button"
                    onClick={() => handleDownload(video.index)}
                    disabled={loading}
                    className="rounded-xl border border-white/6 px-3 py-2.5 text-xs font-syne font-600 text-zinc-300 hover:border-white/15 hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Download video {video.index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Download */}
          {!info.hasNoVideo && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["video", "Video", "MP4"],
                  ["audio", "Audio", "MP3"],
                ] as const).map(([value, label, extension]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    disabled={loading}
                    className={`rounded-xl border px-3 py-2.5 text-center transition-colors ${
                      format === value
                        ? "border-zinc-300/50 bg-white/10 text-white"
                        : "border-white/6 text-zinc-500 hover:border-white/15"
                    }`}
                  >
                    <span className="block text-xs font-syne font-600">{label}</span>
                    <span className="block text-[9px] opacity-60">{extension}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleDownload()}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-zinc-100 to-zinc-400 text-black font-syne font-600 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-xl shadow-zinc-500/20 flex items-center justify-center gap-2"
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
                  Download {format === "audio" ? "Audio" : "Video"}
                </>
              )}
              </button>
            </div>
          )}
        </div>
      )}
    </DownloaderShell>
  );
}
