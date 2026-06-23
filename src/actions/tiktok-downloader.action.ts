"use server";

import {
  tiktokDownloaderService,
  TikTokVideoInfo,
  cleanTikTokUrl,
  isValidTikTokUrl,
  resolveTikTokShortUrl,
} from "@/core/services/tiktok.service";

export interface GetTikTokInfoResult {
  success: boolean;
  data?: TikTokVideoInfo;
  error?: string;
}

/**
 * Server Action: Fetch TikTok video metadata
 */
export async function getTikTokInfoAction(
  rawUrl: string,
): Promise<GetTikTokInfoResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = await resolveTikTokShortUrl(rawUrl.trim());

  if (!isValidTikTokUrl(url)) {
    return { success: false, error: "Invalid TikTok URL" };
  }

  try {
    const info = await tiktokDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (err: any) {
    console.error("[getTikTokInfoAction]", err?.message);
    return {
      success: false,
      error: err?.message ?? "Failed to fetch TikTok info",
    };
  }
}

export interface PrepareTikTokDownloadResult {
  success: boolean;
  downloadPath?: string;
  filename?: string;
  error?: string;
}

/**
 * Server Action: Build download URL for route handler.
 * variant: "nowatermark" | "watermark" | "audio"
 */
export async function prepareTikTokDownloadAction(
  rawUrl: string,
  variant: "nowatermark" | "watermark" | "audio" = "nowatermark",
  title: string = "tiktok",
): Promise<PrepareTikTokDownloadResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = await resolveTikTokShortUrl(rawUrl.trim());
  const ext = variant === "audio" ? "mp3" : "mp4";
  const filename = tiktokDownloaderService.buildSafeFilename(title, ext);

  const params = new URLSearchParams({ url, variant, filename });

  return {
    success: true,
    downloadPath: `/internal/download/tiktok?${params.toString()}`,
    filename,
  };
}
