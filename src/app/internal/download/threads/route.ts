import { NextRequest, NextResponse } from "next/server";
import {
  threadsDownloaderService,
  isValidThreadsUrl,
} from "@/core/services/threads.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const filename = searchParams.get("filename") ?? "threads.mp4";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isValidThreadsUrl(url)) {
    return NextResponse.json(
      { error: "Invalid Threads URL" },
      { status: 400 },
    );
  }

  try {
    const ytStream = threadsDownloaderService.createDownloadStream(url);

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        ytStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        ytStream.on("end", () => controller.close());
        ytStream.on("error", (err: Error) => {
          console.error("[threads stream]", err.message);
          controller.error(err);
        });
      },
      cancel() {
        if ("destroy" in ytStream) (ytStream as any).destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error("[/internal/download/threads]", err?.message);
    return NextResponse.json(
      { error: err?.message ?? "Download failed" },
      { status: 500 },
    );
  }
}
