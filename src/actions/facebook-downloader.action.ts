"use server";

import {
  facebookDownloaderService,
  FacebookVideoInfo,
  cleanFacebookUrl,
  isValidFacebookUrl,
  resolveFacebookUrl,
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

  const cleanedUrl = cleanFacebookUrl(rawUrl.trim());

  if (!isValidFacebookUrl(cleanedUrl)) {
    return {
      success: false,
      error: "Invalid Facebook URL. Paste a facebook.com or fb.watch link.",
    };
  }

  try {
    const url = await resolveFacebookUrl(cleanedUrl);
    const info = await facebookDownloaderService.getVideoInfo(url);
    return { success: true, data: info };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    console.error("[getFacebookInfoAction]", message);

    if (message.includes("login") || message.includes("private")) {
      return {
        success: false,
        error: "This content is private or requires Facebook login.",
      };
    }

    if (
      /unsupported|cannot parse|no video|no media|not available/i.test(message)
    ) {
      return {
        success: false,
        error:
          "Facebook resolved this public post, but did not expose its media to the server. Refresh SOCIAL_COOKIES_BASE64 and try again.",
      };
    }

    return {
      success: false,
      error: message || "Failed to fetch Facebook media",
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

  const cleanedUrl = cleanFacebookUrl(rawUrl.trim());
  if (!isValidFacebookUrl(cleanedUrl)) {
    return { success: false, error: "Invalid Facebook URL" };
  }

  let url: string;
  try {
    url = await resolveFacebookUrl(cleanedUrl);
  } catch {
    return {
      success: false,
      error: "Facebook could not resolve this share link. Try Fetch again.",
    };
  }
  const ext = quality === "audio" ? "mp3" : "mp4";
  const filename = facebookDownloaderService.buildSafeFilename(title, ext);
  const params = new URLSearchParams({ url, quality, filename });

  return {
    success: true,
    downloadPath: `/internal/download/facebook?${params.toString()}`,
    filename,
  };
}
