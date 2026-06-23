import { NextRequest, NextResponse } from "next/server";
import {
  tiktokDownloaderService,
  isValidTikTokUrl,
} from "@/core/services/tiktok.service";
import {
  createCompatibleMp4Stream,
  nodeStreamToWebResponse,
} from "@/core/server/media-compat";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const variant = (searchParams.get("variant") ?? "nowatermark") as
    | "nowatermark"
    | "watermark"
    | "audio";
  const filename = searchParams.get("filename") ?? "tiktok.mp4";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isValidTikTokUrl(url)) {
    return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 });
  }

  try {
    const contentType = variant === "audio" ? "audio/mpeg" : "video/mp4";
    const ytStream = tiktokDownloaderService.createDownloadStream(url, variant);
    const outputStream =
      variant === "audio"
        ? ytStream
        : createCompatibleMp4Stream(ytStream, { logPrefix: "tiktok" });

    return nodeStreamToWebResponse(outputStream, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Transfer-Encoding": "chunked",
    });
  } catch (err: any) {
    console.error("[/internal/download/tiktok]", err?.message);
    return NextResponse.json(
      { error: err?.message ?? "Download failed" },
      { status: 500 },
    );
  }
}
