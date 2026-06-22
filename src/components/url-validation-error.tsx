"use client";

import Link from "next/link";
import {
  isPlatformUrl,
  type PlatformType,
} from "@/core/utils/url-validators";

const PLATFORM_LABELS: Record<PlatformType, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X / Twitter",
  threads: "Threads",
};

interface UrlValidationErrorProps {
  error: string;
  inputUrl: string;
  expectedPlatform: PlatformType;
}

export default function UrlValidationError({
  error,
  inputUrl,
  expectedPlatform,
}: UrlValidationErrorProps) {
  const detectedPlatform = isPlatformUrl(inputUrl);
  const wrongPlatform =
    detectedPlatform && detectedPlatform !== expectedPlatform
      ? detectedPlatform
      : null;

  return (
    <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0" aria-hidden="true">
          !
        </span>
        <span>{error}</span>
      </div>

      {wrongPlatform && (
        <div className="flex flex-col gap-2 border-t border-red-500/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-zinc-400">
            This looks like a {PLATFORM_LABELS[wrongPlatform]} link.
          </span>
          <Link
            href={`/${wrongPlatform}`}
            className="inline-flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15"
          >
            Open {PLATFORM_LABELS[wrongPlatform]} Downloader
          </Link>
        </div>
      )}
    </div>
  );
}
