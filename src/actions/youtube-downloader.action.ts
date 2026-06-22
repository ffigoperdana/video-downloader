"use server";

import {
  youtubeDownloaderService,
  VideoInfo,
} from "@/core/services/youtube.service";
import { isValidYoutubeUrl } from "@/core/utils/url-validators";

export interface GetVideoInfoResult {
  success: boolean;
  data?: VideoInfo;
  error?: string;
}

function cleanYoutubeUrl(url: string): string {
  try {
    const u = new URL(url);
    const isYoutube =
      u.hostname === "youtube.com" ||
      u.hostname.endsWith(".youtube.com") ||
      u.hostname === "youtu.be";
    if (!isYoutube) return url;
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/watch?v=${v}`;
  } catch {}
  return url;
}

export async function getVideoInfoAction(
  rawUrl: string,
): Promise<GetVideoInfoResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanYoutubeUrl(rawUrl.trim());

  if (!isValidYoutubeUrl(url)) {
    return { success: false, error: "Invalid YouTube URL" };
  }

  try {
    const info = await youtubeDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (err: any) {
    console.error("[getVideoInfoAction]", err?.message);
    const message = String(err?.message ?? "");
    if (message.includes("Sign in to confirm")) {
      return {
        success: false,
        error:
          "YouTube requires authentication for this video. Configure YTDLP_COOKIES_BASE64 in Coolify using a Netscape cookies.txt export.",
      };
    }
    return {
      success: false,
      error: err?.message ?? "Failed to fetch video info",
    };
  }
}

export interface PrepareDownloadResult {
  success: boolean;
  downloadPath?: string;
  filename?: string;
  error?: string;
}

export async function prepareDownloadAction(
  rawUrl: string,
  quality: string = "best",
  title: string = "video",
  formatId?: string,
): Promise<PrepareDownloadResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanYoutubeUrl(rawUrl.trim());
  const ext = quality === "audio" ? "m4a" : "mp4";
  const filename = youtubeDownloaderService.buildSafeFilename(title, ext);

  const params = new URLSearchParams({
    url,
    quality,
    filename,
    ...(formatId ? { formatId } : {}),
  });

  return {
    success: true,
    downloadPath: `/internal/download/youtube?${params.toString()}`,
    filename,
  };
}
