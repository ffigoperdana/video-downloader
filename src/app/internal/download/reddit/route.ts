import { NextRequest, NextResponse } from "next/server";
import {
  cleanRedditUrl,
  isValidRedditUrl,
  redditDownloaderService,
} from "@/core/services/reddit.service";
import {
  isRedditDirectMediaUrl,
  isRedditShareUrl,
} from "@/core/utils/reddit-url";
import { resolveRedditUrl } from "@/core/services/reddit-resolver.service";
import {
  createCompatibleMp4Stream,
  nodeStreamToWebResponse,
} from "@/core/server/media-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DIRECT_REDDIT_MEDIA_HEADERS =
  "Referer: https://www.reddit.com/\r\n" +
  "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36\r\n";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const format = searchParams.get("format") === "audio" ? "audio" : "video";
  const filename =
    searchParams.get("filename") ??
    (format === "audio" ? "reddit.mp3" : "reddit.mp4");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const sourceUrl = cleanRedditUrl(url);
  if (!isValidRedditUrl(sourceUrl)) {
    return NextResponse.json(
      { error: "Invalid Reddit post URL" },
      { status: 400 },
    );
  }

  try {
    const resolvedUrl = await resolveRedditUrl(sourceUrl);
    if (isRedditShareUrl(resolvedUrl)) {
      return NextResponse.json(
        { error: "Unable to resolve this Reddit share link." },
        { status: 400 },
      );
    }

    if (isRedditDirectMediaUrl(resolvedUrl) && format === "audio") {
      return NextResponse.json(
        {
          error:
            "Direct Reddit media links may not include audio. Paste the post or share link instead.",
        },
        { status: 400 },
      );
    }

    const outputStream = isRedditDirectMediaUrl(resolvedUrl)
      ? createCompatibleMp4Stream(resolvedUrl, {
          inputHeaders: DIRECT_REDDIT_MEDIA_HEADERS,
          logPrefix: "reddit-direct",
        })
      : (() => {
          const ytStream = redditDownloaderService.createDownloadStream(
            resolvedUrl,
            format,
          );
          return format === "audio"
            ? ytStream
            : createCompatibleMp4Stream(ytStream, { logPrefix: "reddit" });
        })();

    return nodeStreamToWebResponse(outputStream, {
      "Content-Type": format === "audio" ? "audio/mpeg" : "video/mp4",
      "Content-Disposition":
        "attachment; filename=\"" + encodeURIComponent(filename) + "\"",
      "Transfer-Encoding": "chunked",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Download failed";
    console.error("[/internal/download/reddit]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
