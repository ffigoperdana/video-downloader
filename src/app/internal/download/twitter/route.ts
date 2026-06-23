import { NextRequest, NextResponse } from "next/server";
import {
  twitterDownloaderService,
  isValidTwitterUrl,
} from "@/core/services/twitter.service";
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
  const filename = searchParams.get("filename") ?? "twitter.mp4";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isValidTwitterUrl(url)) {
    return NextResponse.json(
      { error: "Invalid X/Twitter URL" },
      { status: 400 },
    );
  }

  const contentType = quality === "audio" ? "audio/mpeg" : "video/mp4";

  try {
    const ytStream = twitterDownloaderService.createDownloadStream(url, quality);
    const outputStream =
      quality === "audio"
        ? ytStream
        : createCompatibleMp4Stream(ytStream, { logPrefix: "twitter" });

    return nodeStreamToWebResponse(outputStream, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Transfer-Encoding": "chunked",
    });
  } catch (err: any) {
    console.error("[/internal/download/twitter]", err?.message);
    return NextResponse.json(
      { error: err?.message ?? "Download failed" },
      { status: 500 },
    );
  }
}
