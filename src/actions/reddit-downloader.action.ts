"use server";

import {
  cleanRedditUrl,
  isValidRedditUrl,
  redditDownloaderService,
  type RedditPostInfo,
} from "@/core/services/reddit.service";
import {
  buildRedditDownloadFilename,
  isRedditDirectMediaUrl,
  isRedditShareUrl,
} from "@/core/utils/reddit-url";
import { resolveRedditUrl } from "@/core/services/reddit-resolver.service";

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
        "Invalid Reddit URL. Paste a post, gallery, Reddit share link, or direct packaged-media video URL.",
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

  const sourceUrl = cleanRedditUrl(rawUrl.trim());
  if (!isValidRedditUrl(sourceUrl)) {
    return { success: false, error: "Invalid Reddit post URL" };
  }

  const url = await resolveRedditUrl(sourceUrl);
  if (isRedditShareUrl(url)) {
    return {
      success: false,
      error:
        "Unable to resolve this Reddit share link. Open the post and copy its post URL instead.",
    };
  }

  if (isRedditDirectMediaUrl(url) && format === "audio") {
    return {
      success: false,
      error:
        "Direct Reddit media links may not include audio. Paste the post or share link to download the full video with audio.",
    };
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
