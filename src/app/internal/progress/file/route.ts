import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getCompletedDownloadFile } from "@/core/server/download-job-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

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
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      "Content-Length": String(file.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
