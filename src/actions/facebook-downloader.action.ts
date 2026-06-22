"use server";

import {
  facebookDownloaderService,
  FacebookVideoInfo,
  cleanFacebookUrl,
  isValidFacebookUrl,
} from "@/core/services/facebook.service";

export interface GetFacebookInfoResult {
  success: boolean;
  data?: FacebookVideoInfo;
  error?: string;
}

export async function getFacebookInfoAction(
  rawUrl: string,
): Promise<GetFacebookInfoResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanFacebookUrl(rawUrl.trim());

  if (!isValidFacebookUrl(url)) {
    return {
      success: false,
      error: "Invalid Facebook URL. Paste a facebook.com or fb.watch link.",
    };
  }

  try {
    const info = await facebookDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (err: any) {
    console.error("[getFacebookInfoAction]", err?.message);

    if (err?.message?.includes("login") || err?.message?.includes("private")) {
      return {
        success: false,
        error: "This content is private or requires Facebook login.",
      };
    }

    return {
      success: false,
      error: err?.message ?? "Failed to fetch Facebook video info",
    };
  }
}

export interface PrepareFacebookDownloadResult {
  success: boolean;
  downloadPath?: string;
  filename?: string;
  error?: string;
}

export async function prepareFacebookDownloadAction(
  rawUrl: string,
  quality: string = "best",
  title: string = "facebook",
): Promise<PrepareFacebookDownloadResult> {
  if (!rawUrl?.trim()) {
    return { success: false, error: "URL is required" };
  }

  const url = cleanFacebookUrl(rawUrl.trim());
  const ext = quality === "audio" ? "mp3" : "mp4";
  const filename = facebookDownloaderService.buildSafeFilename(title, ext);
  const params = new URLSearchParams({ url, quality, filename });

  return {
    success: true,
    downloadPath: `/internal/download/facebook?${params.toString()}`,
    filename,
  };
}
