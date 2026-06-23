import { NextRequest, NextResponse } from "next/server";
import { getDownloadJob } from "@/core/server/download-job-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const job = getDownloadJob(id);
  if (!job) {
    return NextResponse.json({ error: "Download job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
