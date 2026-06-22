import YTDlpWrap from "yt-dlp-wrap";
import { isValidTwitterUrl as validateTwitterUrl } from "@/core/utils/url-validators";
import {
  getSocialImageAssets,
  type SocialImageAsset,
} from "./social-image.service";

export interface TwitterVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  uploader_id: string;
  view_count: number;
  like_count: number;
  retweet_count: number;
  formats: TwitterFormat[];
  images: SocialImageAsset[];
  media_type: "video" | "image";
  hasNoVideo: boolean;
}

export interface TwitterFormat {
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

export function cleanTwitterUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const isTwitter =
      u.hostname === "x.com" ||
      u.hostname === "www.x.com" ||
      u.hostname === "twitter.com" ||
      u.hostname === "www.twitter.com";
    if (!isTwitter) return rawUrl;
    return `https://twitter.com${u.pathname}`;
  } catch {}
  return rawUrl;
}

export function isValidTwitterUrl(url: string): boolean {
  return validateTwitterUrl(url);
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

const TW_HEADERS = [
  "--add-header",
  "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

export class TwitterDownloaderService {
  private ytDlp: YTDlpWrap;

  constructor() {
    this.ytDlp = new YTDlpWrap(getBinaryPath());
  }

  async getVideoInfo(rawUrl: string): Promise<TwitterVideoInfo> {
    const url = cleanTwitterUrl(rawUrl);
    const imagesPromise = getSocialImageAssets(url, "twitter").catch(() => []);

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
          ...TW_HEADERS,
        ]),
        45_000,
        "twitter:getVideoInfo",
      );
    } catch (error) {
      const images = await imagesPromise;
      if (!images.length) throw error;
      return {
        id: url.match(/status\/(\d+)/)?.[1] ?? "",
        title: "X image post",
        description: "",
        thumbnail: images[0].previewPath,
        duration: 0,
        uploader: "Unknown",
        uploader_id: "",
        view_count: 0,
        like_count: 0,
        retweet_count: 0,
        formats: [],
        images,
        media_type: "image",
        hasNoVideo: true,
      };
    }

    let raw: any;
    try {
      raw = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[twitter:getVideoInfo] raw:", jsonStr.slice(0, 300));
      throw new Error("Failed to parse yt-dlp output for X/Twitter");
    }

    const formats: TwitterFormat[] = (raw.formats ?? [])
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
      .sort((a: TwitterFormat, b: TwitterFormat) => b.quality - a.quality);

    const images = await imagesPromise;

    return {
      id: raw.id ?? "",
      title: raw.title ?? raw.description?.slice(0, 80) ?? "X Post",
      description: raw.description ?? "",
      thumbnail: raw.thumbnail ?? "",
      duration: Number(raw.duration) || 0,
      uploader: raw.uploader ?? "Unknown",
      uploader_id: raw.uploader_id ?? "",
      view_count: Number(raw.view_count) || 0,
      like_count: Number(raw.like_count) || 0,
      retweet_count: Number(raw.retweet_count) || 0,
      formats,
      images,
      media_type: formats.length ? "video" : "image",
      hasNoVideo: formats.length === 0,
    };
  }

  createDownloadStream(
    rawUrl: string,
    quality: string = "best",
  ): NodeJS.ReadableStream {
    const url = cleanTwitterUrl(rawUrl);

    let formatArg: string;
    switch (quality) {
      case "720p":
        formatArg = "best[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best";
        break;
      case "480p":
        formatArg = "best[height<=480][ext=mp4]/bestvideo[height<=480]+bestaudio/best";
        break;
      case "audio":
        formatArg = "bestaudio/best";
        break;
      default:
        formatArg = "best[ext=mp4]/bestvideo+bestaudio/best";
    }

    const audioArgs =
      quality === "audio"
        ? ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
        : [];

    return this.ytDlp.execStream([
      url,
      "-f",
      formatArg,
      ...audioArgs,
      "-o",
      "-",
      "--no-warnings",
      "--no-check-certificate",
      "--extractor-retries",
      "2",
      ...TW_HEADERS,
    ]);
  }

  buildSafeFilename(title: string, ext: string = "mp4"): string {
    const safe =
      title.replace(/[<>:"/\\|?*\x00-\x1f#]/g, "").trim() || "twitter";
    return `${safe.slice(0, 80)}.${ext}`;
  }
}

export const twitterDownloaderService = new TwitterDownloaderService();
