"use server";

import {
  threadsDownloaderService,
  ThreadsPostInfo,
  cleanThreadsUrl,
  isValidThreadsUrl,
} from "@/core/services/threads.service";
import { getThreadsMediaAssets } from "@/core/services/social-image.service";

export interface GetThreadsInfoResult {
  success: boolean;
  data?: ThreadsPostInfo;
  error?: string;
}

export async function getThreadsInfoAction(
  rawUrl: string,
): Promise<GetThreadsInfoResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanThreadsUrl(rawUrl.trim());

  if (!isValidThreadsUrl(url)) {
    return {
      success: false,
      error:
        "Invalid Threads URL. Paste a threads.com post link.",
    };
  }

  try {
    const info = await threadsDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (err: any) {
    console.error("[getThreadsInfoAction]", err?.message);

    if (err?.message?.includes("login") || err?.message?.includes("private")) {
      return {
        success: false,
        error: "This content is private or requires login.",
      };
    }

    return {
      success: false,
      error:
        err?.message ??
        "Failed to fetch this public Threads post.",
    };
  }
}

export interface PrepareThreadsDownloadResult {
  success: boolean;
  downloadPath?: string;
  filename?: string;
  error?: string;
}

export async function prepareThreadsDownloadAction(
  rawUrl: string,
  title: string = "threads",
  format: "video" | "audio" = "video",
  videoIndex: number = 0,
): Promise<PrepareThreadsDownloadResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanThreadsUrl(rawUrl.trim());
  try {
    const media = await getThreadsMediaAssets(url);
    const video = media.videos[videoIndex];
    if (video) {
      const extension = format === "audio" ? "mp3" : "mp4";
      const filename = threadsDownloaderService.buildSafeFilename(title, extension);
      const separator = video.downloadPath.includes("?") ? "&" : "?";
      return {
        success: true,
        downloadPath: `${video.downloadPath}${separator}${new URLSearchParams({ mode: format, filename }).toString()}`,
        filename,
      };
    }
  } catch {}

  const extension = format === "audio" ? "mp3" : "mp4";
  const filename = threadsDownloaderService.buildSafeFilename(title, extension);
  const params = new URLSearchParams({ url, filename, format });

  return {
    success: true,
    downloadPath: `/internal/download/threads?${params.toString()}`,
    filename,
  };
}
