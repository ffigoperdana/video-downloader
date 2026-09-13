import YTDlpWrap from "yt-dlp-wrap";
import {
  cleanRedditUrl,
  isValidRedditUrl,
} from "@/core/utils/reddit-url";
import {
  getRedditPost,
  getRedditPostThumbnail,
  getRedditVideoDuration,
  isRedditNativeVideo,
} from "./reddit-post.service";
import {
  getSocialImageAssets,
  type SocialImageAsset,
} from "./social-image.service";

export interface RedditFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  quality: number;
}

export interface RedditPostInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  uploader_id: string;
  subreddit: string;
  view_count: number;
  like_count: number;
  formats: RedditFormat[];
  images: SocialImageAsset[];
  media_type: "video" | "image";
  hasNoVideo: boolean;
}

interface RedditYtDlpFormat {
  format_id?: string;
  ext?: string;
  resolution?: string;
  width?: number;
  height?: number;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  quality?: number;
}

interface RedditYtDlpInfo {
  id?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  uploader_id?: string;
  view_count?: number;
  like_count?: number;
  formats?: RedditYtDlpFormat[];
  url?: string;
}

const getBinaryPath = () => process.env.YTDLP_BINARY_PATH ?? "yt-dlp";

const REDDIT_HEADERS = [
  "--add-header",
  "Referer:https://www.reddit.com/",
  "--add-header",
  "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
];

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(label + " timed out after " + String(ms / 1000) + "s")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function formatRedditFormats(raw: RedditYtDlpInfo): RedditFormat[] {
  return (raw.formats ?? [])
    .filter((format) => format.vcodec !== "none" || format.acodec !== "none")
    .map((format) => ({
      format_id: format.format_id ?? "",
      ext: format.ext ?? "mp4",
      resolution:
        format.resolution ??
        (format.width && format.height
          ? String(format.width) + "x" + String(format.height)
          : "unknown"),
      fps: format.fps ?? null,
      filesize: format.filesize ?? format.filesize_approx ?? null,
      vcodec: format.vcodec ?? "none",
      acodec: format.acodec ?? "none",
      quality: Number(format.quality) || 0,
    }))
    .sort((left, right) => right.quality - left.quality);
}

export class RedditDownloaderService {
  private ytDlp: YTDlpWrap;

  constructor() {
    this.ytDlp = new YTDlpWrap(getBinaryPath());
  }

  async getVideoInfo(rawUrl: string): Promise<RedditPostInfo> {
    const url = cleanRedditUrl(rawUrl);
    const post = await getRedditPost(url);
    const isVideo = isRedditNativeVideo(post);

    if (!isVideo) {
      const images = await getSocialImageAssets(url, "reddit").catch(() => []);
      if (!images.length) {
        throw new Error(
          "This Reddit post does not contain a downloadable image or native video.",
        );
      }

      return {
        id: post.id ?? "",
        title: post.title ?? "Reddit image post",
        description: post.selftext ?? "",
        thumbnail: images[0]?.previewPath ?? getRedditPostThumbnail(post),
        duration: 0,
        uploader: post.author ?? "Unknown",
        uploader_id: post.author ?? "",
        subreddit: post.subreddit_name_prefixed ?? post.subreddit ?? "",
        view_count: 0,
        like_count: Number(post.score) || 0,
        formats: [],
        images,
        media_type: "image",
        hasNoVideo: true,
      };
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
          "--no-playlist",
          "--extractor-retries",
          "3",
          ...REDDIT_HEADERS,
        ]),
        45_000,
        "reddit:getVideoInfo",
      );
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Unable to extract this Reddit video.");
    }

    let raw: RedditYtDlpInfo;
    try {
      raw = JSON.parse(jsonStr.trim()) as RedditYtDlpInfo;
    } catch {
      console.error("[reddit:getVideoInfo] raw:", jsonStr.slice(0, 300));
      throw new Error("Failed to parse yt-dlp output for Reddit");
    }

    const formats = formatRedditFormats(raw);
    const hasVideo = formats.length > 0 || Boolean(raw.url);

    return {
      id: post.id ?? raw.id ?? "",
      title: post.title ?? raw.title ?? "Reddit video",
      description: post.selftext ?? raw.description ?? "",
      thumbnail: raw.thumbnail ?? getRedditPostThumbnail(post),
      duration: Number(raw.duration) || getRedditVideoDuration(post),
      uploader: post.author ?? raw.uploader ?? "Unknown",
      uploader_id: post.author ?? raw.uploader_id ?? "",
      subreddit: post.subreddit_name_prefixed ?? post.subreddit ?? "",
      view_count: Number(raw.view_count) || 0,
      like_count: Number(post.score) || Number(raw.like_count) || 0,
      formats,
      images: [],
      media_type: "video",
      hasNoVideo: !hasVideo,
    };
  }

  createDownloadStream(
    rawUrl: string,
    format: "video" | "audio" = "video",
  ): NodeJS.ReadableStream {
    const url = cleanRedditUrl(rawUrl);
    const formatArg =
      format === "audio"
        ? "bestaudio/best"
        : "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best";
    const audioArgs =
      format === "audio"
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
      "--no-warnings",
      "--no-check-certificate",
      "--extractor-retries",
      "3",
      ...REDDIT_HEADERS,
    ]);
  }
}

export { cleanRedditUrl, isValidRedditUrl } from "@/core/utils/reddit-url";

export const redditDownloaderService = new RedditDownloaderService();
