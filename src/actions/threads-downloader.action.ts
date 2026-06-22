"use server";

import {
  threadsDownloaderService,
  ThreadsPostInfo,
  cleanThreadsUrl,
  isValidThreadsUrl,
} from "@/core/services/threads.service";

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
        "Invalid Threads URL. Paste a threads.net link with /post/ or /t/.",
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
        "Failed to fetch Threads post. Threads support is experimental — some posts may not work.",
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
): Promise<PrepareThreadsDownloadResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanThreadsUrl(rawUrl.trim());
  const filename = threadsDownloaderService.buildSafeFilename(title);
  const params = new URLSearchParams({ url, filename });

  return {
    success: true,
    downloadPath: `/internal/download/threads?${params.toString()}`,
    filename,
  };
}
