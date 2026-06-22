import { NextRequest, NextResponse } from "next/server";
import {
  twitterDownloaderService,
  isValidTwitterUrl,
} from "@/core/services/twitter.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        ytStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        ytStream.on("end", () => controller.close());
        ytStream.on("error", (err: Error) => {
          console.error("[twitter stream]", err.message);
          controller.error(err);
        });
      },
      cancel() {
        if ("destroy" in ytStream) (ytStream as any).destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error("[/internal/download/twitter]", err?.message);
    return NextResponse.json(
      { error: err?.message ?? "Download failed" },
      { status: 500 },
    );
  }
}
