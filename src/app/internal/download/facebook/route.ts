import { NextRequest, NextResponse } from "next/server";
import {
  facebookDownloaderService,
  isValidFacebookUrl,
} from "@/core/services/facebook.service";
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
  const filename = searchParams.get("filename") ?? "facebook.mp4";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isValidFacebookUrl(url)) {
    return NextResponse.json(
      { error: "Invalid Facebook URL" },
      { status: 400 },
    );
  }

  const contentType = quality === "audio" ? "audio/mpeg" : "video/mp4";

  try {
    const ytStream = facebookDownloaderService.createDownloadStream(url, quality);
    const outputStream =
      quality === "audio"
        ? ytStream
        : createCompatibleMp4Stream(ytStream, { logPrefix: "facebook" });

    return nodeStreamToWebResponse(outputStream, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Transfer-Encoding": "chunked",
    });
  } catch (err: any) {
    console.error("[/internal/download/facebook]", err?.message);
    return NextResponse.json(
      { error: err?.message ?? "Download failed" },
      { status: 500 },
    );
  }
}
