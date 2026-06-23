import YTDlpWrap from "yt-dlp-wrap";
import { isValidTikTokUrl as validateTikTokUrl } from "@/core/utils/url-validators";
import {
  getSocialImageAssets,
  type SocialImageAsset,
} from "./social-image.service";

export interface TikTokVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  uploader_id: string;
  view_count: number;
  like_count: number;
  formats: TikTokFormat[];
  images: SocialImageAsset[];
  media_type: "video" | "image";
  hasNoVideo: boolean;
}

export interface TikTokFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  format_note: string;
  quality: number;
  /** true = video+audio muxed (most TikTok formats) */
  hasBoth: boolean;
}

const getBinaryPath = () => process.env.YTDLP_BINARY_PATH ?? "yt-dlp";

/**
 * Normalize TikTok URLs — strip query params, handle vm.tiktok.com short links.
 * yt-dlp handles redirects fine, but clean URLs are more reliable.
 */
export function cleanTikTokUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    // vm.tiktok.com/XXXXX/ — short link, let yt-dlp resolve
    if (u.hostname === "vm.tiktok.com" || u.hostname === "vt.tiktok.com") {
      return rawUrl.split("?")[0];
    }
    // www.tiktok.com/@user/video/VIDEO_ID
    if (u.hostname === "tiktok.com" || u.hostname.endsWith(".tiktok.com")) {
      // Strip query params (tracking etc.)
      return `${u.origin}${u.pathname}`;
    }
  } catch {}
  return rawUrl;
}

export function isValidTikTokUrl(url: string): boolean {
  return validateTikTokUrl(url);
}

function extractPhotoUrlFromError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = message.match(
    /https?:\/\/(?:www\.)?tiktok\.com\/@[^/\s]+\/photo\/\d+(?:[^\s]*)?/i,
  );
  return match ? cleanTikTokUrl(match[0]) : null;
}

export async function resolveTikTokShortUrl(rawUrl: string): Promise<string> {
  const url = cleanTikTokUrl(rawUrl);
  try {
    const parsed = new URL(url);
    if (!["vm.tiktok.com", "vt.tiktok.com"].includes(parsed.hostname.toLowerCase())) {
      return url;
    }

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const location = response.headers.get("location");
    if (location) return cleanTikTokUrl(new URL(location, url).toString());

    const followed = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(12_000),
    });
    return cleanTikTokUrl(followed.url || url);
  } catch {
    return url;
  }
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

export class TikTokDownloaderService {
  private ytDlp: YTDlpWrap;

  constructor() {
    this.ytDlp = new YTDlpWrap(getBinaryPath());
  }

  /**
   * Fetch TikTok video metadata via yt-dlp -J.
   * TikTok videos are always muxed (no separate audio/video streams),
   * so format selection is simpler than YouTube.
   */
  async getVideoInfo(rawUrl: string): Promise<TikTokVideoInfo> {
    const url = await resolveTikTokShortUrl(rawUrl);
    const imagesPromise = getSocialImageAssets(url, "tiktok").catch(() => []);
    const isPhotoPost = /\/photo\/\d+\/?$/i.test(new URL(url).pathname);

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
          "--add-header",
          "Referer:https://www.tiktok.com/",
        ]),
        45_000,
        "tiktok:getVideoInfo",
      );
    } catch (error) {
      const images = await imagesPromise;
      const fallbackUrl = extractPhotoUrlFromError(error);
      const fallbackImages =
        !images.length && fallbackUrl
          ? await getSocialImageAssets(fallbackUrl, "tiktok").catch(() => [])
          : [];
      const availableImages = images.length ? images : fallbackImages;
      if (!availableImages.length) throw error;
      return {
        id: (fallbackUrl ?? url).match(/\/(?:photo|video)\/(\d+)/)?.[1] ?? "",
        title: "TikTok image post",
        thumbnail: availableImages[0].previewPath,
        duration: 0,
        uploader: "Unknown",
        uploader_id: "",
        view_count: 0,
        like_count: 0,
        formats: [],
        images: availableImages,
        media_type: "image",
        hasNoVideo: true,
      };
    }

    let raw: any;
    try {
      raw = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[tiktok:getVideoInfo] raw:", jsonStr.slice(0, 300));
      throw new Error("Failed to parse yt-dlp output for TikTok");
    }

    if (isPhotoPost) {
      const images = await imagesPromise;
      if (images.length) {
        return {
          id: url.match(/\/photo\/(\d+)/)?.[1] ?? raw.id ?? "",
          title: raw.title ?? raw.description ?? "TikTok image post",
          thumbnail: images[0].previewPath,
          duration: 0,
          uploader: raw.uploader ?? raw.creator ?? "Unknown",
          uploader_id: raw.uploader_id ?? raw.channel_id ?? "",
          view_count: Number(raw.view_count) || 0,
          like_count: Number(raw.like_count) || 0,
          formats: [],
          images,
          media_type: "image",
          hasNoVideo: true,
        };
      }
    }

    const formats: TikTokFormat[] = (raw.formats ?? [])
      .filter((f: any) => f.vcodec !== "none")
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
        format_note: f.format_note ?? "",
        quality: f.quality ?? 0,
        // TikTok: if acodec is not "none" the file has audio too
        hasBoth: f.acodec && f.acodec !== "none",
      }))
      .sort((a: TikTokFormat, b: TikTokFormat) => b.quality - a.quality);

    const hasVideo =
      formats.length > 0 || Boolean(raw.url) || Number(raw.duration) > 0;
    const images = hasVideo ? [] : await imagesPromise;

    return {
      id: raw.id ?? "",
      title: raw.title ?? raw.description ?? "TikTok Video",
      thumbnail: raw.thumbnail ?? "",
      duration: Number(raw.duration) || 0,
      uploader: raw.uploader ?? raw.creator ?? "Unknown",
      uploader_id: raw.uploader_id ?? raw.channel_id ?? "",
      view_count: Number(raw.view_count) || 0,
      like_count: Number(raw.like_count) || 0,
      formats,
      images,
      media_type: hasVideo ? "video" : "image",
      hasNoVideo: !hasVideo,
    };
  }

  /**
   * Pipe yt-dlp stdout directly to caller.
   * yt-dlp handles all TikTok CDN auth/cookies/headers internally —
   * no need to manually proxy the CDN URL (which causes 403).
   *
   * variant:
   *   "nowatermark" — no watermark (yt-dlp selects best no-wm format)
   *   "watermark"   — original with TikTok watermark
   *   "audio"       — audio only
   */
  createDownloadStream(
    rawUrl: string,
    variant: "nowatermark" | "watermark" | "audio" = "nowatermark",
  ): NodeJS.ReadableStream {
    const url = cleanTikTokUrl(rawUrl);

    // TikTok yt-dlp format selectors:
    // "download"          = no-watermark MP4 (most reliable)
    // "h264_540p_*"       = specific resolution variants
    // bestvideo+bestaudio = may give watermarked version
    // For audio: bestaudio
    let formatArg: string;
    switch (variant) {
      case "audio":
        formatArg = "bestaudio/best";
        break;
      case "watermark":
        // play_addr / randomcover = the in-app playback URL which has TikTok watermark
        formatArg =
          "h264_540p_download/h264_360p_download/download/best[ext=mp4]/best";
        break;
      default: // nowatermark
        // "h264_*_randomcover" formats = no watermark (just the raw video file)
        // "download" on some regions still has watermark, so prefer randomcover first
        formatArg =
          "h264_1080p_randomcover/h264_720p_randomcover/h264_540p_randomcover/h264_360p_randomcover/best[ext=mp4]/best";
    }

    const audioArgs =
      variant === "audio"
        ? ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
        : [];

    return this.ytDlp.execStream([
      url,
      "-f",
      formatArg,
      ...audioArgs,
      "-o",
      "-", // pipe to stdout
      "--no-warnings",
      "--no-check-certificate",
      "--add-header",
      "Referer:https://www.tiktok.com/",
      "--add-header",
      "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]);
  }

  buildSafeFilename(title: string, ext: string = "mp4"): string {
    const safe = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "tiktok";
    // TikTok titles can be very long (captions) — trim to 80 chars
    return `${safe.slice(0, 80)}.${ext}`;
  }
}

export const tiktokDownloaderService = new TikTokDownloaderService();
