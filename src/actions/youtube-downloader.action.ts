"use server";

import {
  youtubeDownloaderService,
  VideoInfo,
  YoutubePlaylistInfo,
  cleanYoutubeInputUrl,
  isYoutubePlaylistUrl,
} from "@/core/services/youtube.service";
import { isValidYoutubeUrl } from "@/core/utils/url-validators";

export interface GetVideoInfoResult {
  success: boolean;
  data?: VideoInfo;
  playlist?: YoutubePlaylistInfo;
  error?: string;
}

export async function getVideoInfoAction(
  rawUrl: string,
): Promise<GetVideoInfoResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanYoutubeInputUrl(rawUrl.trim());

  if (!isValidYoutubeUrl(url)) {
    return { success: false, error: "Invalid YouTube URL" };
  }

  try {
    if (isYoutubePlaylistUrl(url)) {
      const playlist = await youtubeDownloaderService.getPlaylistInfo(url);
      return { success: true, playlist };
    }
    const info = await youtubeDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    console.error("[getVideoInfoAction]", message);
    if (message.includes("Sign in to confirm")) {
      return {
        success: false,
        error:
          "YouTube requires authentication for this video. Configure YTDLP_COOKIES_BASE64 in Coolify using a Netscape cookies.txt export.",
      };
    }
    return {
      success: false,
      error: message || "Failed to fetch video info",
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

  const url = cleanUrlForDownload(rawUrl.trim());
  const ext = quality === "audio" ? "mp3" : "mp4";
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

function cleanUrlForDownload(rawUrl: string): string {
  return cleanYoutubeInputUrl(rawUrl)
    .replace(/([?&])list=[^&]+&?/, "$1")
    .replace(/[?&]$/, "");
}

export interface PlaylistDownloadRequest {
  url: string;
  title: string;
}

export async function preparePlaylistDownloadsAction(
  entries: PlaylistDownloadRequest[],
  quality: string = "best",
): Promise<{
  success: boolean;
  items?: PrepareDownloadResult[];
  error?: string;
}> {
  if (!entries.length || entries.length > 2000) {
    return {
      success: false,
      error: "Playlist size must be between 1 and 2000 videos",
    };
  }

  const items: PrepareDownloadResult[] = [];
  for (const entry of entries) {
    if (!isValidYoutubeUrl(entry.url) || isYoutubePlaylistUrl(entry.url)) {
      return { success: false, error: "Playlist contains an invalid video URL" };
    }
    items.push(await prepareDownloadAction(entry.url, quality, entry.title));
  }
  return { success: true, items };
}
