import YTDlpWrap from "yt-dlp-wrap";
import { isValidThreadsUrl as validateThreadsUrl } from "@/core/utils/url-validators";
import {
  getThreadsMediaAssets,
  type ThreadsMediaAssets,
  type SocialImageAsset,
} from "./social-image.service";

export interface ThreadsPostInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  uploader_id: string;
  formats: ThreadsFormat[];
  media_type: string;
  hasNoVideo: boolean;
  images: SocialImageAsset[];
  videos: ThreadsMediaAssets["videos"];
}

export interface ThreadsFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  quality: number;
}

const getBinaryPath = () => process.env.YTDLP_BINARY_PATH ?? "yt-dlp";

export function cleanThreadsUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (!/^(.+\.)?threads\.(net|com)$/.test(u.hostname)) return rawUrl;
    return `https://www.threads.com${u.pathname}`;
  } catch {}
  return rawUrl;
}

export function isValidThreadsUrl(url: string): boolean {
  return validateThreadsUrl(url);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

const THREADS_HEADERS = [
  "--add-header",
  "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

function mapDirectMediaInfo(
  url: string,
  urlUsername: string | undefined,
  media: Awaited<ReturnType<typeof getThreadsMediaAssets>>,
): ThreadsPostInfo {
  const hasVideo = media.videos.length > 0;
  const hasImages = media.images.length > 0;
  return {
    id: url.split("/post/")[1] ?? "",
    title:
      hasVideo && hasImages
        ? `Threads mixed post${urlUsername ? ` by @${urlUsername}` : ""}`
        : hasVideo
          ? `Threads video${urlUsername ? ` by @${urlUsername}` : ""}`
          : `Threads image post${urlUsername ? ` by @${urlUsername}` : ""}`,
    description: "",
    thumbnail: media.images[0]?.previewPath ?? "",
    duration: 0,
    uploader: urlUsername ?? "Threads",
    uploader_id: urlUsername ?? "",
    formats: hasVideo
      ? [
          {
            format_id: "direct",
            ext: "mp4",
            resolution: "best",
            fps: null,
            filesize: null,
            vcodec: "unknown",
            acodec: "unknown",
            quality: 1,
          },
        ]
      : [],
    media_type: hasVideo && hasImages ? "mixed" : hasVideo ? "video" : "image",
    hasNoVideo: !hasVideo,
    images: media.images,
    videos: media.videos,
  };
}

export class ThreadsDownloaderService {
  private ytDlp: YTDlpWrap;

  constructor() {
    this.ytDlp = new YTDlpWrap(getBinaryPath());
  }

  async getVideoInfo(rawUrl: string): Promise<ThreadsPostInfo> {
    const url = cleanThreadsUrl(rawUrl);
    const urlUsername = new URL(url).pathname.match(/^\/@([^/]+)\/post\//)?.[1];
    const media = await getThreadsMediaAssets(url).catch(() => null);
    if (media && (media.images.length || media.videos.length)) {
      return mapDirectMediaInfo(url, urlUsername, media);
    }

    let jsonStr: string;
    try {
      jsonStr = await withTimeout(
        this.ytDlp.execPromise([
          url,
          "-J",
          "--skip-download",
          "--no-warnings",
          "--no-check-certificate",
          "--extractor-retries",
          "3",
          ...THREADS_HEADERS,
        ]),
        45_000,
        "threads:getVideoInfo",
      );
    } catch (error) {
      throw new Error(
        "Unable to extract this Threads post right now. Threads support is experimental; please try again later.",
      );
    }

    let raw: any;
    try {
      raw = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[threads:getVideoInfo] raw:", jsonStr.slice(0, 300));
      throw new Error(
        "Failed to parse yt-dlp output for Threads. This post may be unsupported or private.",
      );
    }

    const formats: ThreadsFormat[] = (raw.formats ?? [])
      .filter((f: any) => f.vcodec !== "none" || f.acodec !== "none")
      .map((f: any) => ({
        format_id: f.format_id,
        ext: f.ext ?? "mp4",
        resolution:
          f.resolution ??
          (f.width && f.height ? `${f.width}x${f.height}` : "unknown"),
        fps: f.fps ?? null,
        filesize: f.filesize ?? f.filesize_approx ?? null,
        vcodec: f.vcodec ?? "none",
        acodec: f.acodec ?? "none",
        quality: f.quality ?? 0,
      }))
      .sort((a: ThreadsFormat, b: ThreadsFormat) => b.quality - a.quality);

    const hasDirectVideo = false;
    const images: SocialImageAsset[] = [];
    const hasNoVideo = formats.length === 0 && !raw.duration && !hasDirectVideo;

    return {
      id: raw.id ?? "",
      title: raw.title ?? raw.description?.slice(0, 80) ?? "Threads Post",
      description: raw.description ?? "",
      thumbnail: raw.thumbnail ?? "",
      duration: Number(raw.duration) || 0,
      uploader: raw.uploader ?? raw.channel ?? urlUsername ?? "Threads",
      uploader_id: raw.uploader_id ?? urlUsername ?? "",
      formats,
      media_type: hasNoVideo ? "image" : "video",
      hasNoVideo,
      images,
      videos: [],
    };
  }

  createDownloadStream(
    rawUrl: string,
    format: "video" | "audio" = "video",
  ): NodeJS.ReadableStream {
    const url = cleanThreadsUrl(rawUrl);

    return this.ytDlp.execStream([
      url,
      "-f",
      format === "audio"
        ? "bestaudio/best"
        : "bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best",
      ...(format === "audio"
        ? ["-x", "--audio-format", "mp3", "--audio-quality", "2"]
        : []),
      "-o",
      "-",
      "--no-warnings",
      "--no-check-certificate",
      "--extractor-retries",
      "3",
      ...THREADS_HEADERS,
      "--add-header",
      "Referer:https://www.threads.net/",
    ]);
  }

  buildSafeFilename(title: string, ext: string = "mp4"): string {
    const safe =
      title.replace(/[<>:"/\\|?*\x00-\x1f#]/g, "").trim() || "threads";
    return `${safe.slice(0, 80)}.${ext}`;
  }
}

export const threadsDownloaderService = new ThreadsDownloaderService();
