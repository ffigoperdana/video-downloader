"use server";

import {
  cleanRedditUrl,
  isValidRedditUrl,
  redditDownloaderService,
  type RedditPostInfo,
} from "@/core/services/reddit.service";
import { buildRedditDownloadFilename } from "@/core/utils/reddit-url";

export interface GetRedditInfoResult {
  success: boolean;
  data?: RedditPostInfo;
  error?: string;
}

export async function getRedditInfoAction(
  rawUrl: string,
): Promise<GetRedditInfoResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanRedditUrl(rawUrl.trim());
  if (!isValidRedditUrl(url)) {
    return {
      success: false,
      error:
        "Invalid Reddit URL. Paste a post, gallery, or redd.it share link.",
    };
  }

  try {
    const info = await redditDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    console.error("[getRedditInfoAction]", message);
    return {
      success: false,
      error: message || "Failed to fetch this public Reddit post.",
    };
  }
}

export interface PrepareRedditDownloadResult {
  success: boolean;
  downloadPath?: string;
  filename?: string;
  error?: string;
}

export async function prepareRedditDownloadAction(
  rawUrl: string,
  format: "video" | "audio" = "video",
  title: string = "reddit",
  username?: string,
  postId?: string,
): Promise<PrepareRedditDownloadResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanRedditUrl(rawUrl.trim());
  if (!isValidRedditUrl(url)) {
    return { success: false, error: "Invalid Reddit post URL" };
  }

  const filename = buildRedditDownloadFilename(url, {
    extension: format === "audio" ? "mp3" : "mp4",
    mediaType: format,
    username,
    postId,
    title,
  });
  const params = new URLSearchParams({ url, format, filename });

  return {
    success: true,
    downloadPath: "/internal/download/reddit?" + params.toString(),
    filename,
  };
}
