import { NextRequest, NextResponse } from "next/server";
import { youtubeDownloaderService } from "@/core/services/youtube.service";
import { isValidYoutubeUrl } from "@/core/utils/url-validators";

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

  const contentType = quality === "audio" ? "audio/mp4" : "video/mp4";

  try {
    const direct = await youtubeDownloaderService.getDirectUrls(url, quality);

    if (!direct.needsMerge && direct.singleUrl) {
      const cdnResponse = await fetch(direct.singleUrl, {
        headers: {
          // Forward range header so resumable downloads work
          ...(request.headers.get("range")
            ? { Range: request.headers.get("range")! }
            : {}),
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const status = cdnResponse.status; // 200 or 206
      const headers = new Headers({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Accept-Ranges": "bytes",
      });

      ["content-length", "content-range"].forEach((h) => {
        const v = cdnResponse.headers.get(h);
        if (v) headers.set(h, v);
      });

      return new Response(cdnResponse.body, { status, headers });
    }

    const ytStream = youtubeDownloaderService.createMergedStream(url, quality);

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        ytStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        ytStream.on("end", () => controller.close());
        ytStream.on("error", (err: Error) => {
          console.error("[merged stream]", err.message);
          controller.error(err);
        });
      },
      cancel() {
        const destroyable = ytStream as { destroy?: () => void };
        destroyable.destroy?.();
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Transfer-Encoding": "chunked",
      },
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
