import { NextRequest, NextResponse } from "next/server";
import { youtubeDownloaderService } from "@/core/services/youtube.service";
import { isValidYoutubeUrl } from "@/core/utils/url-validators";
import {
  createCompatibleMp4Stream,
  nodeStreamToWebResponse,
} from "@/core/server/media-compat";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const quality = searchParams.get("quality") ?? "best";
  const filename = searchParams.get("filename") ?? "video.mp4";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isValidYoutubeUrl(url)) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  const contentType = quality === "audio" ? "audio/mpeg" : "video/mp4";

  try {
    const ytStream = youtubeDownloaderService.createMergedStream(url, quality);
    const outputStream =
      quality === "audio"
        ? ytStream
        : createCompatibleMp4Stream(ytStream, { logPrefix: "youtube" });

    return nodeStreamToWebResponse(outputStream, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Transfer-Encoding": "chunked",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Download failed";
    console.error("[/internal/download/youtube]", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
