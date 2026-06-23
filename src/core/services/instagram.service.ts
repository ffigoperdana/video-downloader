import YTDlpWrap from "yt-dlp-wrap";
import { isValidInstagramUrl as validateInstagramUrl } from "@/core/utils/url-validators";
import {
  getInstagramMediaAssets,
  getSocialImageAssets,
  type InstagramMediaAssets,
  type SocialImageAsset,
} from "./social-image.service";

export interface InstagramVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  uploader_id: string;
  timestamp: number;
  like_count: number;
  media_type: string;
  entries: InstagramEntry[];
  formats: InstagramFormat[];
  /** true if this post has no downloadable video (image-only post) */
  hasNoVideo: boolean;
  images: SocialImageAsset[];
}

export interface InstagramEntry {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  formats: InstagramFormat[];
  index: number;
  /** true = this slide is a video, false = image only */
  isVideo: boolean;
  /** Direct fallback download URL for video entries extracted outside yt-dlp */
  downloadPath?: string;
}

export interface InstagramFormat {
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

export function cleanInstagramUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (u.hostname !== "instagram.com" && !u.hostname.endsWith(".instagram.com")) {
      return rawUrl;
    }
    return `https://www.instagram.com${u.pathname}`;
  } catch {}
  return rawUrl;
}

export function isValidInstagramUrl(url: string): boolean {
  return validateInstagramUrl(url);
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

function inferMediaType(url: string): string {
  if (url.includes("/reel/") || url.includes("/reels/")) return "reel";
  if (url.includes("/tv/")) return "igtv";
  if (url.includes("/stories/")) return "story";
  return "post";
}

function hasVideoFormats(formats: any[]): boolean {
  return formats.some((f: any) => f.vcodec && f.vcodec !== "none");
}

function isVideoUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return /\.(?:mp4|m4v|mov|webm|m3u8)(?:$|[?#])/i.test(url.pathname);
  } catch {
    return /\.(?:mp4|m4v|mov|webm|m3u8)(?:$|[?#])/i.test(value);
  }
}

function isVideoEntry(entry: any): boolean {
  const requestedDownloads = Array.isArray(entry.requested_downloads)
    ? entry.requested_downloads
    : [];

  return (
    hasVideoFormats(entry.formats ?? []) ||
    Boolean(entry.duration) ||
    entry.ext === "mp4" ||
    entry.media_type === "video" ||
    entry.__typename === "GraphVideo" ||
    isVideoUrl(entry.url) ||
    isVideoUrl(entry.video_url) ||
    requestedDownloads.some(
      (download: any) => download?.ext === "mp4" || isVideoUrl(download?.url),
    )
  );
}

function mapFormat(f: any): InstagramFormat {
  return {
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
  };
}

function mapMediaAssetEntries(
  media: InstagramMediaAssets | null,
): InstagramEntry[] {
  return (
    media?.items.map((item, index) => ({
      id: `${item.type}-${item.index}`,
      title: `Slide ${index + 1}`,
      thumbnail: item.type === "image" ? item.previewPath : "",
      duration: 0,
      formats: [],
      index,
      isVideo: item.type === "video",
      downloadPath: item.type === "video" ? item.downloadPath : undefined,
    })) ?? []
  );
}

const IG_HEADERS = [
  "--add-header",
  "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

export class InstagramDownloaderService {
  private ytDlp: YTDlpWrap;

  constructor() {
    this.ytDlp = new YTDlpWrap(getBinaryPath());
  }

  async getVideoInfo(rawUrl: string): Promise<InstagramVideoInfo> {
    const url = cleanInstagramUrl(rawUrl);
    const mediaType = inferMediaType(url);
    const imagesPromise = getSocialImageAssets(url, "instagram").catch(() => []);
    const mediaPromise = getInstagramMediaAssets(url).catch(() => null);

    // Stories always require login — fail fast with a clear message
    if (mediaType === "story") {
      throw new Error(
        "Stories require Instagram login (cookies). Only public posts and reels are supported without login.",
      );
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
          "2",
          ...IG_HEADERS,
        ]),
        45_000,
        "instagram:getVideoInfo",
      );
    } catch (error) {
      const media = await mediaPromise;
      const entries = mapMediaAssetEntries(media);
      const images = media?.images.length ? media.images : await imagesPromise;
      if (!images.length && !entries.some((entry) => entry.isVideo)) throw error;
      return {
        id: url.split("/").filter(Boolean).at(-1) ?? "",
        title: entries.some((entry) => entry.isVideo)
          ? "Instagram carousel"
          : "Instagram image post",
        description: "",
        thumbnail:
          images[0]?.previewPath ??
          entries.find((entry) => entry.thumbnail)?.thumbnail ??
          "",
        duration: 0,
        uploader: "Unknown",
        uploader_id: "",
        timestamp: 0,
        like_count: 0,
        media_type: mediaType,
        entries,
        formats: [],
        hasNoVideo: !entries.some((entry) => entry.isVideo),
        images,
      };
    }

    let raw: any;
    try {
      raw = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[instagram:getVideoInfo] raw:", jsonStr.slice(0, 300));
      throw new Error("Failed to parse yt-dlp output for Instagram");
    }

    // Carousel / playlist
    if (raw._type === "playlist" && Array.isArray(raw.entries)) {
      const media = await mediaPromise;
      let videoAssetIndex = 0;
      const entries: InstagramEntry[] = raw.entries
        .filter((e: any) => e != null)
        .map((e: any, i: number) => {
          const entryFormats = e.formats ?? [];
          const isVideo = isVideoEntry(e);
          const fallbackVideo = isVideo ? media?.videos[videoAssetIndex++] : null;
          return {
            id: e.id ?? `entry_${i}`,
            title: e.title ?? `Slide ${i + 1}`,
            // Don't expose CDN thumbnail URL directly — proxy it instead
            thumbnail: e.thumbnail
              ? `/internal/preview/instagram?url=${encodeURIComponent(e.thumbnail)}`
              : "",
            duration: Number(e.duration) || 0,
            formats: entryFormats
              .filter((f: any) => f.vcodec !== "none")
              .map(mapFormat)
              .sort(
                (a: InstagramFormat, b: InstagramFormat) =>
                  b.quality - a.quality,
              ),
            index: i,
            isVideo,
            downloadPath: fallbackVideo?.downloadPath,
          };
        });

      // Check if ANY entry has video
      const anyVideo = entries.some((e) => e.isVideo);
      const fallbackEntries = mapMediaAssetEntries(media);
      const finalEntries =
        !anyVideo && fallbackEntries.some((entry) => entry.isVideo)
          ? fallbackEntries
          : entries;
      const images = media?.images.length ? media.images : await imagesPromise;

      return {
        id: raw.id ?? "",
        title: raw.title ?? raw.description?.slice(0, 80) ?? "Instagram Post",
        description: raw.description ?? "",
        thumbnail: raw.thumbnail
          ? `/internal/preview/instagram?url=${encodeURIComponent(raw.thumbnail)}`
          : (entries[0]?.thumbnail ?? ""),
        duration: 0,
        uploader: raw.uploader ?? raw.channel ?? "Unknown",
        uploader_id: raw.uploader_id ?? raw.channel_id ?? "",
        timestamp: raw.timestamp ?? 0,
        like_count: Number(raw.like_count) || 0,
        media_type: mediaType,
        entries: finalEntries,
        formats: [],
        hasNoVideo: !finalEntries.some((entry) => entry.isVideo),
        images,
      };
    }

    // Single post
    const formats: InstagramFormat[] = (raw.formats ?? [])
      .filter((f: any) => f.vcodec !== "none")
      .map(mapFormat)
      .sort((a: InstagramFormat, b: InstagramFormat) => b.quality - a.quality);

    const hasVideo = formats.length > 0;
    const media = await mediaPromise;
    const fallbackEntries = mapMediaAssetEntries(media);
    const images = media?.images.length ? media.images : await imagesPromise;
    const shouldUseFallbackCarousel =
      fallbackEntries.length > 1 && fallbackEntries.some((entry) => entry.isVideo);

    return {
      id: raw.id ?? "",
      title: raw.title ?? raw.description?.slice(0, 80) ?? "Instagram Video",
      description: raw.description ?? "",
      thumbnail: raw.thumbnail
        ? `/internal/preview/instagram?url=${encodeURIComponent(raw.thumbnail)}`
        : "",
      duration: Number(raw.duration) || 0,
      uploader: raw.uploader ?? raw.channel ?? "Unknown",
      uploader_id: raw.uploader_id ?? raw.channel_id ?? "",
      timestamp: raw.timestamp ?? 0,
      like_count: Number(raw.like_count) || 0,
      media_type: mediaType,
      entries: shouldUseFallbackCarousel ? fallbackEntries : [],
      formats,
      hasNoVideo:
        shouldUseFallbackCarousel
          ? !fallbackEntries.some((entry) => entry.isVideo)
          : !hasVideo,
      images,
    };
  }

  createDownloadStream(
    rawUrl: string,
    entryIndex?: number,
  ): NodeJS.ReadableStream {
    const url = cleanInstagramUrl(rawUrl);

    const args = [
      url,
      "-f",
      "best[ext=mp4][vcodec^=avc1][acodec^=mp4a]/best[ext=mp4]/best",
      "-o",
      "-",
      "--no-warnings",
      "--no-check-certificate",
      ...IG_HEADERS,
      "--add-header",
      "Referer:https://www.instagram.com/",
    ];

    if (entryIndex !== undefined) {
      args.push("--playlist-items", String(entryIndex + 1));
    }

    return this.ytDlp.execStream(args);
  }

  buildSafeFilename(title: string, ext: string = "mp4"): string {
    const safe =
      title.replace(/[<>:"/\\|?*\x00-\x1f#]/g, "").trim() || "instagram";
    return `${safe.slice(0, 80)}.${ext}`;
  }
}

export const instagramDownloaderService = new InstagramDownloaderService();
