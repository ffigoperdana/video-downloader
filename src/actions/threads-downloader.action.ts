"use server";

import {
  threadsDownloaderService,
  ThreadsPostInfo,
  cleanThreadsUrl,
  isValidThreadsUrl,
} from "@/core/services/threads.service";
import { getThreadsMediaAssets } from "@/core/services/social-image.service";
import { resolveThreadsUrlCandidates } from "@/core/services/threads-resolver.service";
import { buildThreadsDownloadFilename } from "@/core/utils/threads-url";

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

  const url = cleanThreadsUrl(rawUrl.trim(), { preserveQuery: true });

  if (!isValidThreadsUrl(url)) {
    return {
      success: false,
      error:
        "Invalid Threads URL. Paste a threads.com post or share link.",
    };
  }

  try {
    const info = await threadsDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    console.error("[getThreadsInfoAction]", message);

    if (/login|private/i.test(message)) {
      return {
        success: false,
        error: "This content is private or requires login.",
      };
    }

    return {
      success: false,
      error:
        message ||
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

async function getThreadsDownloadFilename(
  rawUrl: string,
  format: "video" | "audio",
  videoIndex: number,
  title: string,
): Promise<string> {
  const resolvedUrl =
    (await resolveThreadsUrlCandidates(rawUrl).catch(() => []))[0] ?? rawUrl;
  return buildThreadsDownloadFilename(resolvedUrl, {
    extension: format === "audio" ? "mp3" : "mp4",
    mediaType: format,
    index: videoIndex,
    title,
  });
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

  const url = cleanThreadsUrl(rawUrl.trim(), { preserveQuery: true });
  if (!isValidThreadsUrl(url)) {
    return { success: false, error: "Invalid Threads URL" };
  }

  try {
    const media = await getThreadsMediaAssets(url);
    const video = media.videos[videoIndex];
    if (video) {
      const filename = await getThreadsDownloadFilename(
        url,
        format,
        videoIndex,
        title,
      );
      const separator = video.downloadPath.includes("?") ? "&" : "?";
      return {
        success: true,
        downloadPath: `${video.downloadPath}${separator}${new URLSearchParams({ mode: format, filename }).toString()}`,
        filename,
      };
    }
  } catch {}

  const filename = await getThreadsDownloadFilename(
    url,
    format,
    videoIndex,
    title,
  );
  const fallbackUrl =
    (await resolveThreadsUrlCandidates(url).catch(() => []))[0] ?? url;
  const params = new URLSearchParams({ url: fallbackUrl, filename, format });

  return {
    success: true,
    downloadPath: `/internal/download/threads?${params.toString()}`,
    filename,
  };
}
