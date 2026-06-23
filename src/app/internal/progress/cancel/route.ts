import { NextRequest, NextResponse } from "next/server";
import { cancelDownloadJob } from "@/core/server/download-job-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const job = cancelDownloadJob(body.id);
  if (!job) {
    return NextResponse.json({ error: "Download job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
