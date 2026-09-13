import { NextRequest, NextResponse } from "next/server";
import {
  isValidRedditUrl,
  redditDownloaderService,
} from "@/core/services/reddit.service";
import {
  createCompatibleMp4Stream,
  nodeStreamToWebResponse,
} from "@/core/server/media-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const format = searchParams.get("format") === "audio" ? "audio" : "video";
  const filename =
    searchParams.get("filename") ??
    (format === "audio" ? "reddit.mp3" : "reddit.mp4");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isValidRedditUrl(url)) {
    return NextResponse.json(
      { error: "Invalid Reddit post URL" },
      { status: 400 },
    );
  }

  try {
    const ytStream = redditDownloaderService.createDownloadStream(url, format);
    const outputStream =
      format === "audio"
        ? ytStream
        : createCompatibleMp4Stream(ytStream, { logPrefix: "reddit" });

    return nodeStreamToWebResponse(outputStream, {
      "Content-Type": format === "audio" ? "audio/mpeg" : "video/mp4",
      "Content-Disposition":
        "attachment; filename=\"" + encodeURIComponent(filename) + "\"",
      "Transfer-Encoding": "chunked",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Download failed";
    console.error("[/internal/download/reddit]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
