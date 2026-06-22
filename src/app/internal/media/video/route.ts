import { NextRequest, NextResponse } from "next/server";
import {
  extractThreadsMedia,
  isSupportedPostUrl,
} from "@/core/services/social-image.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const sourceUrl = searchParams.get("url");
  const index = Number(searchParams.get("index"));

  if (
    platform !== "threads" ||
    !sourceUrl ||
    !isSupportedPostUrl(sourceUrl, "threads") ||
    !Number.isInteger(index) ||
    index < 0
  ) {
    return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
  }

  try {
    const media = await extractThreadsMedia(sourceUrl);
    const video = media.videos[index];
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const upstream = await fetch(video.remoteUrl, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: sourceUrl },
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Video CDN returned HTTP ${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") ?? "video/mp4";
    if (
      !contentType.toLowerCase().startsWith("video/") &&
      contentType.toLowerCase() !== "application/octet-stream"
    ) {
      throw new Error("Upstream response is not a video");
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'attachment; filename="threads-video.mp4"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[/internal/media/video]", error);
    return NextResponse.json({ error: "Unable to retrieve this video" }, { status: 502 });
  }
}
