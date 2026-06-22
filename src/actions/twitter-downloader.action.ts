"use server";

import {
  twitterDownloaderService,
  TwitterVideoInfo,
  cleanTwitterUrl,
  isValidTwitterUrl,
} from "@/core/services/twitter.service";

export interface GetTwitterInfoResult {
  success: boolean;
  data?: TwitterVideoInfo;
  error?: string;
}

export async function getTwitterInfoAction(
  rawUrl: string,
): Promise<GetTwitterInfoResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanTwitterUrl(rawUrl.trim());

  if (!isValidTwitterUrl(url)) {
    return {
      success: false,
      error: "Invalid X/Twitter URL. Paste a post link with /status/.",
    };
  }

  try {
    const info = await twitterDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (err: any) {
    console.error("[getTwitterInfoAction]", err?.message);
    return {
      success: false,
      error: err?.message ?? "Failed to fetch X/Twitter post info",
    };
  }
}

export interface PrepareTwitterDownloadResult {
  success: boolean;
  downloadPath?: string;
  filename?: string;
  error?: string;
}

export async function prepareTwitterDownloadAction(
  rawUrl: string,
  quality: string = "best",
  title: string = "twitter",
): Promise<PrepareTwitterDownloadResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanTwitterUrl(rawUrl.trim());
  const ext = quality === "audio" ? "mp3" : "mp4";
  const filename = twitterDownloaderService.buildSafeFilename(title, ext);
  const params = new URLSearchParams({ url, quality, filename });

  return {
    success: true,
    downloadPath: `/internal/download/twitter?${params.toString()}`,
    filename,
  };
}
