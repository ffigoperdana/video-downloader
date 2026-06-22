import YTDlpWrap from "yt-dlp-wrap";

export interface FacebookVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  view_count: number;
  like_count: number;
  formats: FacebookFormat[];
  media_type: string;
}

export interface FacebookFormat {
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

export function cleanFacebookUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (u.hostname === "fb.watch") return rawUrl;
    if (u.hostname.includes("facebook.com")) {
      // Normalize: strip query params, keep path only
      return `https://www.facebook.com${u.pathname}`;
    }
  } catch {}
  return rawUrl;
}

export function isValidFacebookUrl(url: string): boolean {
  return /(?:facebook\.com|fb\.watch)\/.*/.test(url);
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
  if (url.includes("/reel/")) return "reel";
  if (url.includes("/watch")) return "video";
  if (url.includes("/stories/")) return "story";
  return "video";
}

const FB_HEADERS = [
  "--add-header",
  "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

export class FacebookDownloaderService {
  private ytDlp: YTDlpWrap;

  constructor() {
    this.ytDlp = new YTDlpWrap(getBinaryPath());
  }

  async getVideoInfo(rawUrl: string): Promise<FacebookVideoInfo> {
    const url = cleanFacebookUrl(rawUrl);
    const mediaType = inferMediaType(url);

    const jsonStr = await withTimeout(
      this.ytDlp.execPromise([
        url,
        "-J",
        "--skip-download",
        "--no-warnings",
        "--no-check-certificate",
        "--extractor-retries",
        "2",
        ...FB_HEADERS,
      ]),
      45_000,
      "facebook:getVideoInfo",
    );

    let raw: any;
    try {
      raw = JSON.parse(jsonStr.trim());
    } catch {
      console.error("[facebook:getVideoInfo] raw:", jsonStr.slice(0, 300));
      throw new Error("Failed to parse yt-dlp output for Facebook");
    }

    const formats: FacebookFormat[] = (raw.formats ?? [])
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
      .sort((a: FacebookFormat, b: FacebookFormat) => b.quality - a.quality);

    return {
      id: raw.id ?? "",
      title: raw.title ?? raw.description?.slice(0, 80) ?? "Facebook Video",
      thumbnail: raw.thumbnail ?? "",
      duration: Number(raw.duration) || 0,
      uploader: raw.uploader ?? raw.channel ?? "Unknown",
      view_count: Number(raw.view_count) || 0,
      like_count: Number(raw.like_count) || 0,
      formats,
      media_type: mediaType,
    };
  }

  createDownloadStream(
    rawUrl: string,
    quality: string = "best",
  ): NodeJS.ReadableStream {
    const url = cleanFacebookUrl(rawUrl);

    let formatArg: string;
    switch (quality) {
      case "720p":
        formatArg = "best[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best";
        break;
      case "480p":
        formatArg = "best[height<=480][ext=mp4]/bestvideo[height<=480]+bestaudio/best";
        break;
      case "360p":
        formatArg = "best[height<=360][ext=mp4]/best[height<=360]/best";
        break;
      case "audio":
        formatArg = "bestaudio/best";
        break;
      default:
        formatArg = "best[ext=mp4]/bestvideo+bestaudio/best";
    }

    return this.ytDlp.execStream([
      url,
      "-f",
      formatArg,
      "-o",
      "-",
      "--no-warnings",
      "--no-check-certificate",
      "--extractor-retries",
      "2",
      ...FB_HEADERS,
    ]);
  }

  buildSafeFilename(title: string, ext: string = "mp4"): string {
    const safe =
      title.replace(/[<>:"/\\|?*\x00-\x1f#]/g, "").trim() || "facebook";
    return `${safe.slice(0, 80)}.${ext}`;
  }
}

export const facebookDownloaderService = new FacebookDownloaderService();
