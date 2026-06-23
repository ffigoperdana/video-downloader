import { NextRequest, NextResponse } from "next/server";
import { createDownloadJob } from "@/core/server/download-job-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      downloadPath?: string;
      filename?: string;
      title?: string;
    };

    if (!body.downloadPath || !body.filename) {
      return NextResponse.json(
        { error: "Missing downloadPath or filename" },
        { status: 400 },
      );
    }

    const job = createDownloadJob({
      origin: new URL(request.url).origin,
      downloadPath: body.downloadPath,
      filename: body.filename,
      title: body.title ?? body.filename,
    });

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start download";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
