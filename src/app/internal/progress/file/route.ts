import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getCompletedDownloadFile } from "@/core/server/download-job-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function getContentType(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "mp4") return "video/mp4";
  if (extension === "mp3") return "audio/mpeg";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return "application/octet-stream";
}

function getAttachmentHeader(filename: string): string {
  const fallback = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const file = await getCompletedDownloadFile(id);
  if (!file) {
    return NextResponse.json(
      { error: "Download file is not ready or has expired" },
      { status: 404 },
    );
  }

  return new Response(Readable.toWeb(file.stream) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": getContentType(file.filename),
      "Content-Disposition": getAttachmentHeader(file.filename),
      "Content-Length": String(file.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
