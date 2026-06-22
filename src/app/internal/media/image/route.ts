import { NextRequest, NextResponse } from "next/server";
import {
  extractSocialImages,
  isSupportedPostUrl,
  type ImagePlatform,
} from "@/core/services/social-image.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORMS = new Set<ImagePlatform>([
  "tiktok",
  "instagram",
  "facebook",
  "twitter",
  "threads",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") as ImagePlatform | null;
  const sourceUrl = searchParams.get("url");
  const index = Number(searchParams.get("index"));
  const download = searchParams.get("download") === "1";

  if (
    !platform ||
    !PLATFORMS.has(platform) ||
    !sourceUrl ||
    !isSupportedPostUrl(sourceUrl, platform) ||
    !Number.isInteger(index) ||
    index < 0
  ) {
    return NextResponse.json({ error: "Invalid media request" }, { status: 400 });
  }

  try {
    const images = await extractSocialImages(sourceUrl, platform);
    const image = images[index];
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const upstream = await fetch(image.remoteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: sourceUrl,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error(`Image CDN returned HTTP ${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) {
      throw new Error("Upstream response is not an image");
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": download
        ? "private, no-store"
        : "public, max-age=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    });

    if (download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${platform}-${index + 1}.${image.extension}"`,
      );
    }

    return new Response(upstream.body, { headers });
  } catch (error) {
    console.error("[/internal/media/image]", error);
    return NextResponse.json(
      { error: "Unable to retrieve this image" },
      { status: 502 },
    );
  }
}
