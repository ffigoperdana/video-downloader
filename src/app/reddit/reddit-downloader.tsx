"use client";

import { useState, useTransition } from "react";
import DownloaderShell from "@/components/downloader-shell";
import Spinner from "@/components/ui/spinner";
import SmartUrlInput from "@/components/smart-url-input";
import UrlValidationError from "@/components/url-validation-error";
import ImageMediaGallery from "@/components/image-media-gallery";
import BatchProgress from "@/components/batch-progress";
import {
  getRedditInfoAction,
  prepareRedditDownloadAction,
} from "@/actions/reddit-downloader.action";
import type { RedditPostInfo } from "@/core/services/reddit.service";
import { fmtCount, fmtDuration } from "@/core/utils/format-helpers";
import { buildRedditDownloadFilename } from "@/core/utils/reddit-url";
import { useDownloadHistory } from "@/core/hooks/use-download-history";
import { useBatchDownload } from "@/core/hooks/use-batch-download";

const DOWNLOAD_TYPES = [
  { value: "video", label: "Video", extension: "MP4" },
  { value: "audio", label: "Audio", extension: "MP3" },
] as const;

export default function RedditDownloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<RedditPostInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<"video" | "audio">("video");
  const [downloading, setDownloading] = useState(false);
  const [isPending, start] = useTransition();
  const { addEntry } = useDownloadHistory();
  const batch = useBatchDownload({
    onComplete: (item) => {
      addEntry({
        url: item.url,
        platform: "reddit",
        title: item.title,
        thumbnail: info?.thumbnail ?? "",
        quality: format === "audio" ? "audio" : "best",
        filename:
          item.filename ??
          (format === "audio" ? "reddit.mp3" : "reddit.mp4"),
        status: "completed",
      });
    },
  });
  const loading = isPending || downloading || batch.active;

  const handleUrlChange = (nextUrl: string) => {
    setUrl(nextUrl);
    setError(null);
    setInfo(null);
  };

  const handleFetch = () => {
    setError(null);
    setInfo(null);
    start(async () => {
      const result = await getRedditInfoAction(url);
      if (result.success && result.data) {
        setInfo(result.data);
        if (result.data.isDirectMedia) setFormat("video");
      } else {
        setError(result.error ?? "Unable to fetch this Reddit post.");
      }
    });
  };

  const handleDownload = () => {
    if (!info) return;
    setError(null);
    setDownloading(true);
    start(async () => {
      const result = await prepareRedditDownloadAction(
        url,
        format,
        info.title,
        info.uploader_id,
        info.id,
      );
      if (!result.success || !result.downloadPath) {
        setError(result.error ?? "Unable to prepare this download.");
        setDownloading(false);
        return;
      }

      batch.addToQueue([
        {
          url,
          title: info.title,
          filename:
            result.filename ??
            (format === "audio" ? "reddit.mp3" : "reddit.mp4"),
          downloadPath: result.downloadPath,
        },
      ]);
      setDownloading(false);
      void batch.startBatch();
    });
  };

  return (
    <DownloaderShell
      accentClass="text-orange-400"
      glowClass="bg-orange-600/5"
      borderGlow="border-orange-500/10"
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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/20">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="13" r="7.2" />
            <circle cx="9.2" cy="12.3" r="0.8" fill="currentColor" />
            <circle cx="14.8" cy="12.3" r="0.8" fill="currentColor" />
            <path d="M8.8 15.2c1.9 1.2 4.5 1.2 6.4 0" strokeLinecap="round" />
            <path d="M14.7 5.9l1.8-2.3 1.8.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18.5" cy="4.2" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <h1 className="font-syne text-xl font-700 text-white">
            Reddit Downloader
          </h1>
          <p className="text-xs text-zinc-500">
            Videos with audio · Image posts · Galleries
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/8 px-3 py-2 text-xs leading-relaxed text-orange-300">
        <span aria-hidden="true">i</span>
        <span>
          Public post and Reddit share links are supported. Native videos are
          downloaded with their audio track when one is available.
        </span>
      </div>

      <SmartUrlInput
        platformName="Reddit"
        placeholder="Paste Reddit post URL..."
        value={url}
        onValueChange={handleUrlChange}
        onFetch={handleFetch}
        disabled={loading}
        fetching={isPending && !downloading}
        glowClassName="from-orange-400/10 to-red-500/10"
        focusBorderClassName="group-focus-within:border-orange-500/30"
        fetchButtonClassName="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/20"
      />

      <p className="text-center text-xs text-zinc-700">
        reddit.com/r/subreddit/comments/POST_ID · reddit.com/gallery/POST_ID ·
        reddit.com/r/subreddit/s/SHARE_ID · redd.it/POST_ID
      </p>

      {error && (
        <UrlValidationError
          error={error}
          inputUrl={url}
          expectedPlatform="reddit"
        />
      )}

      {info && (
        <div className="glass space-y-5 overflow-hidden rounded-3xl border border-white/6 p-5">
          <div className="flex gap-4">
            {info.thumbnail ? (
              <img
                src={info.thumbnail}
                alt=""
                className="h-[72px] w-32 flex-shrink-0 rounded-xl bg-zinc-900 object-cover"
              />
            ) : (
              <div className="flex h-[72px] w-32 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="13" r="7.2" />
                  <circle cx="9.2" cy="12.3" r="0.8" fill="currentColor" />
                  <circle cx="14.8" cy="12.3" r="0.8" fill="currentColor" />
                  <path d="M8.8 15.2c1.9 1.2 4.5 1.2 6.4 0" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
                  {info.hasNoVideo
                    ? "Image post"
                    : info.isDirectMedia
                      ? "Direct video"
                      : "Video"}
                </span>
                {info.subreddit && (
                  <span className="text-xs text-zinc-500">{info.subreddit}</span>
                )}
              </div>
              <p className="font-syne text-sm font-600 leading-snug text-white line-clamp-2">
                {info.title}
              </p>
              <p className="text-sm font-medium text-orange-400">
                {info.uploader_id ? "u/" + info.uploader_id : info.uploader}
              </p>
              {info.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
                  {info.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                {info.duration > 0 && <span>{fmtDuration(info.duration)}</span>}
                {info.like_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{fmtCount(info.like_count)} upvotes</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {info.hasNoVideo && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-400">
              <span className="text-xl">🖼</span>
              <div>
                <p className="font-semibold text-sm">Image post or gallery</p>
                <p className="mt-0.5 text-xs text-amber-400/70">
                  Choose an image below to download it in its original format,
                  JPG, or PNG.
                </p>
              </div>
            </div>
          )}

          {info.isDirectMedia && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-400">
              <span className="text-xl">⚠</span>
              <div>
                <p className="font-semibold text-sm">Direct media fallback</p>
                <p className="mt-0.5 text-xs text-amber-400/70">
                  This copied media file can expire and may not include the
                  original post audio. Paste the post or share link for the
                  best result.
                </p>
              </div>
            </div>
          )}

          <ImageMediaGallery
            images={info.images}
            platformLabel="Reddit"
            onQueueImageDownload={(image, imageFormat) => {
              const extension =
                imageFormat === "original" ? image.extension : imageFormat;
              const downloadPath =
                imageFormat === "original"
                  ? image.downloadPath
                  : image.downloadPath + "&format=" + imageFormat;
              const filename = buildRedditDownloadFilename(url, {
                extension,
                mediaType: "image",
                index: image.index,
                username: info.uploader_id,
                postId: info.id,
                title: info.title,
              });
              batch.addToQueue([
                {
                  url,
                  title: "Reddit image " + String(image.index + 1),
                  filename,
                  downloadPath,
                },
              ]);
              void batch.startBatch();
            }}
          />

          {!info.hasNoVideo && (
            <div className="space-y-3">
              <div
                className={
                  info.isDirectMedia
                    ? "grid grid-cols-1 gap-2"
                    : "grid grid-cols-2 gap-2"
                }
              >
                {(info.isDirectMedia
                  ? DOWNLOAD_TYPES.filter((type) => type.value === "video")
                  : DOWNLOAD_TYPES
                ).map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormat(type.value)}
                    disabled={loading}
                    className={
                      format === type.value
                        ? "rounded-xl border border-orange-500/50 bg-orange-500/10 px-3 py-2.5 text-center text-white transition-colors"
                        : "rounded-xl border border-white/6 px-3 py-2.5 text-center text-zinc-500 transition-colors hover:border-white/15"
                    }
                  >
                    <span className="block text-xs font-syne font-600">
                      {type.label}
                    </span>
                    <span className="block text-[9px] opacity-60">
                      {type.extension}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 py-3.5 text-sm font-syne font-600 text-white shadow-xl shadow-orange-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <Spinner /> Preparing download...
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
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
