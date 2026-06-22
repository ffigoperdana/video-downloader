import YTDlpWrap from "yt-dlp-wrap";
import { writeFileSync } from "node:fs";

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  formats: VideoFormat[];
  uploader: string;
  view_count: number;
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  format_note: string;
  quality: number;
  /** Direct CDN URL — populated by getDirectUrl() */
  url?: string;
}

export interface DownloadOptions {
  url: string;
  formatId?: string;
  quality?: "best" | "1080p" | "720p" | "480p" | "360p" | "audio";
}

export interface DirectUrlResult {
  /** Single merged MP4 URL when available (<=720p) */
  singleUrl?: string;
  /** Separate video + audio URLs for high-res (needs client-side merge or server pipe) */
  videoUrl?: string;
  audioUrl?: string;
  /** Whether this needs server-side merging (video+audio are separate streams) */
  needsMerge: boolean;
  ext: string;
  filename: string;
}

const getBinaryPath = () => process.env.YTDLP_BINARY_PATH ?? "yt-dlp";

let generatedCookiesPath: string | null = null;

function getYoutubeRuntimeArgs(): string[] {
  const configuredPath = process.env.YTDLP_COOKIES_PATH?.trim();
  if (configuredPath) return ["--cookies", configuredPath, "--js-runtimes", "node"];

  const encodedCookies = process.env.YTDLP_COOKIES_BASE64?.trim();
  if (encodedCookies) {
    generatedCookiesPath ??= "/tmp/youtube-cookies.txt";
    writeFileSync(
      generatedCookiesPath,
      Buffer.from(encodedCookies, "base64"),
      { mode: 0o600 },
    );
    return ["--cookies", generatedCookiesPath, "--js-runtimes", "node"];
  }

  return ["--js-runtimes", "node"];
}

export interface YoutubePlaylistEntry {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  uploader: string;
}

export interface YoutubePlaylistInfo {
  id: string;
  title: string;
  uploader: string;
  entries: YoutubePlaylistEntry[];
}

export function cleanUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/watch?v=${v}`;
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
    }
  } catch {}
  return rawUrl;
}

export function cleanYoutubeInputUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const playlistId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");
    if (playlistId) {
      const normalized = new URL(
        videoId
          ? "https://www.youtube.com/watch"
          : "https://www.youtube.com/playlist",
      );
      if (videoId) normalized.searchParams.set("v", videoId);
      normalized.searchParams.set("list", playlistId);
      return normalized.toString();
    }
  } catch {}
  return cleanUrl(rawUrl);
}

export function isYoutubePlaylistUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return Boolean(
      url.searchParams.get("list") &&
        (url.hostname === "youtube.com" ||
          url.hostname.endsWith(".youtube.com")),
    );
  } catch {
    return false;
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

/** Map quality preset to yt-dlp format selector */
function qualityToFormatArg(quality: string): string {
  switch (quality) {
    case "1080p":
      // 1080p: video+audio are ALWAYS separate on YouTube — needs merge
      return "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio";
    case "720p":
      // 720p: prefer single file (mp4), fallback to merge
      return "best[height<=720][ext=mp4]/bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]";
    case "480p":
      return "best[height<=480][ext=mp4]/bestvideo[height<=480]+bestaudio";
    case "360p":
      return "best[height<=360][ext=mp4]/best[height<=360]";
    case "audio":
      return "bestaudio/best";
    default: // "best"
      return "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]";
  }
}

export class YoutubeDownloaderService {
  private ytDlp: YTDlpWrap;

  constructor() {
    this.ytDlp = new YTDlpWrap(getBinaryPath());
  }

  async getVideoInfo(rawUrl: string): Promise<VideoInfo> {
    const url = cleanUrl(rawUrl);

    const jsonStr = await withTimeout(
      this.ytDlp.execPromise([
        url,
        "-J",
        "--no-playlist",
        "--skip-download",
        "--no-check-certificate",
        "--no-warnings",
        "--extractor-retries",
        "2",
        ...getYoutubeRuntimeArgs(),
      ]),
      45_000,
      "getVideoInfo",
    );

    let raw: any;
    try {
      raw = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[getVideoInfo] raw output:", jsonStr.slice(0, 300));
      throw new Error("Failed to parse yt-dlp JSON output");
    }

    const formats: VideoFormat[] = (raw.formats ?? [])
      .filter((f: any) => f.vcodec !== "none" || f.acodec !== "none")
      .map((f: any) => ({
        format_id: f.format_id,
        ext: f.ext ?? "mp4",
        resolution:
          f.resolution ??
          (f.width && f.height ? `${f.width}x${f.height}` : "audio only"),
        fps: f.fps ?? null,
        filesize: f.filesize ?? f.filesize_approx ?? null,
        vcodec: f.vcodec ?? "none",
        acodec: f.acodec ?? "none",
        format_note: f.format_note ?? "",
        quality: f.quality ?? 0,
        url: f.url,
      }))
      .sort((a: VideoFormat, b: VideoFormat) => b.quality - a.quality);

    return {
      id: raw.id ?? "",
      title: raw.title ?? "Unknown",
      thumbnail: raw.thumbnail ?? "",
      duration: Number(raw.duration) || 0,
      formats,
      uploader: raw.uploader ?? raw.channel ?? "Unknown",
      view_count: Number(raw.view_count) || 0,
    };
  }

  async getPlaylistInfo(rawUrl: string): Promise<YoutubePlaylistInfo> {
    const url = cleanYoutubeInputUrl(rawUrl);
    const jsonStr = await withTimeout(
      this.ytDlp.execPromise([
        url,
        "--flat-playlist",
        "--dump-single-json",
        "--yes-playlist",
        "--ignore-errors",
        "--skip-download",
        "--no-check-certificate",
        "--no-warnings",
        "--extractor-retries",
        "2",
        ...getYoutubeRuntimeArgs(),
      ]),
      120_000,
      "getPlaylistInfo",
    );

    const raw = JSON.parse(jsonStr.trim()) as {
      id?: string;
      title?: string;
      uploader?: string;
      channel?: string;
      entries?: Array<{
        id?: string;
        title?: string;
        url?: string;
        webpage_url?: string;
        thumbnail?: string;
        duration?: number;
        uploader?: string;
        channel?: string;
      } | null>;
    };

    const entries = (raw.entries ?? [])
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry?.id))
      .map((entry) => ({
        id: entry.id!,
        title: entry.title ?? "Untitled video",
        url: `https://www.youtube.com/watch?v=${entry.id}`,
        thumbnail:
          entry.thumbnail ?? `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg`,
        duration: Number(entry.duration) || 0,
        uploader: entry.uploader ?? entry.channel ?? "Unknown",
      }));

    if (!entries.length) throw new Error("This playlist has no accessible videos");

    return {
      id: raw.id ?? new URL(url).searchParams.get("list") ?? "playlist",
      title: raw.title ?? "YouTube Playlist",
      uploader: raw.uploader ?? raw.channel ?? "Unknown",
      entries,
    };
  }

  /**
   * Extract direct CDN URL(s) for the requested quality.
   *
   * YouTube serves <=720p as a single muxed file → browser can download directly.
   * 1080p+ comes as separate video+audio → we must pipe+merge on the server.
   *
   * This uses `yt-dlp -g` (get URL) which is very fast (~1-2s).
   */
  async getDirectUrls(
    rawUrl: string,
    quality: string = "best",
  ): Promise<DirectUrlResult> {
    const url = cleanUrl(rawUrl);
    const formatArg = qualityToFormatArg(quality);
    const ext = quality === "audio" ? "mp3" : "mp4";

    // -g prints the direct URL(s), one per line
    // For merged formats it prints 2 lines: video URL then audio URL
    const output = await withTimeout(
      this.ytDlp.execPromise([
        url,
        "-g",
        "-f",
        formatArg,
        "--no-playlist",
        "--no-warnings",
        "--no-check-certificate",
        ...getYoutubeRuntimeArgs(),
      ]),
      20_000,
      "getDirectUrls",
    );

    const lines = output
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error("yt-dlp returned no URLs");
    }

    // Single URL = muxed (video+audio already merged) → safe for direct redirect
    if (lines.length === 1) {
      return { singleUrl: lines[0], needsMerge: false, ext, filename: "" };
    }

    // Two URLs = separate video + audio streams (1080p+) → needs ffmpeg merge
    return {
      videoUrl: lines[0],
      audioUrl: lines[1],
      needsMerge: true,
      ext,
      filename: "",
    };
  }

  /**
   * Server-side pipe+merge stream using yt-dlp + ffmpeg.
   * Only used when video and audio are separate (1080p+).
   */
  createMergedStream(rawUrl: string, quality: string): NodeJS.ReadableStream {
    const url = cleanUrl(rawUrl);
    const formatArg = qualityToFormatArg(quality);

    const audioArgs =
      quality === "audio"
        ? ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
        : ["--merge-output-format", "mp4"];

    return this.ytDlp.execStream([
      url,
      "-f",
      formatArg,
      "--no-playlist",
      ...audioArgs,
      "-o",
      "-",
      ...getYoutubeRuntimeArgs(),
    ]);
  }

  buildSafeFilename(title: string, ext: string = "mp4"): string {
    const safe = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "video";
    return `${safe}.${ext}`;
  }
}

export const youtubeDownloaderService = new YoutubeDownloaderService();
