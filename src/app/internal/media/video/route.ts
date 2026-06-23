import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import {
  createCompatibleMp4Stream,
  nodeStreamToWebResponse,
} from "@/core/server/media-compat";
import {
  extractInstagramMedia,
  extractThreadsMedia,
  isSupportedPostUrl,
} from "@/core/services/social-image.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const sourceUrl = searchParams.get("url");
  const index = Number(searchParams.get("index"));
  const mode = searchParams.get("mode") === "audio" ? "audio" : "video";
  const requestedFilename = searchParams.get("filename") ??
    `threads.${mode === "audio" ? "mp3" : "mp4"}`;
  const filename = requestedFilename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .slice(0, 100);

  const supportedPlatform = platform === "threads" || platform === "instagram";
  if (!supportedPlatform || !sourceUrl || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
  }

  if (
    !isSupportedPostUrl(sourceUrl, platform as "threads" | "instagram")
  ) {
    return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
  }

  try {
    const media =
      platform === "instagram"
        ? await extractInstagramMedia(sourceUrl)
        : await extractThreadsMedia(sourceUrl);
    const video = media.videos[index];
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (mode === "audio") {
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-headers",
          `Referer: ${sourceUrl}\r\nUser-Agent: Mozilla/5.0\r\n`,
          "-i",
          video.remoteUrl,
          "-vn",
          "-codec:a",
          "libmp3lame",
          "-q:a",
          "2",
          "-f",
          "mp3",
          "pipe:1",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      ffmpeg.stderr.on("data", (chunk) =>
        console.error("[threads audio]", chunk.toString().trim()),
      );

      return new Response(
        Readable.toWeb(ffmpeg.stdout) as ReadableStream<Uint8Array>,
        {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    const outputStream = createCompatibleMp4Stream(video.remoteUrl, {
      logPrefix: "threads",
      inputHeaders: `Referer: ${sourceUrl}\r\nUser-Agent: Mozilla/5.0\r\n`,
    });

    return nodeStreamToWebResponse(outputStream, {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
  } catch (error) {
    console.error("[/internal/media/video]", error);
    return NextResponse.json({ error: "Unable to retrieve this video" }, { status: 502 });
  }
}
