import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
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

type ImageOutputFormat = "jpg" | "png";

function getRequestedOutputFormat(value: string | null): ImageOutputFormat | null {
  const format = value?.toLowerCase();
  if (format === "jpg" || format === "jpeg") return "jpg";
  if (format === "png") return "png";
  return null;
}

function convertImageStream(
  body: ReadableStream<Uint8Array>,
  format: ImageOutputFormat,
): Readable {
  const args =
    format === "jpg"
      ? [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          "pipe:0",
          "-frames:v",
          "1",
          "-vf",
          "format=rgb24",
          "-f",
          "image2pipe",
          "-vcodec",
          "mjpeg",
          "-q:v",
          "2",
          "pipe:1",
        ]
      : [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          "pipe:0",
          "-frames:v",
          "1",
          "-f",
          "image2pipe",
          "-vcodec",
          "png",
          "pipe:1",
        ];

  const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
  ffmpeg.stderr.on("data", (chunk) =>
    console.error("[image convert]", chunk.toString().trim()),
  );
  Readable.fromWeb(body as any).pipe(ffmpeg.stdin);
  return ffmpeg.stdout;
}

async function fetchImageUpstream(
  remoteUrl: string,
  platform: ImagePlatform,
  sourceUrl: string,
): Promise<Response> {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
  const attempts: HeadersInit[] =
    platform === "threads"
      ? [
          {
            "User-Agent": userAgent,
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            Referer: "https://lovethreads.net/en",
            Origin: "https://lovethreads.net",
          },
          {
            "User-Agent": userAgent,
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            Referer: sourceUrl,
          },
          {
            "User-Agent": userAgent,
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
        ]
      : [
          {
            "User-Agent": userAgent,
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            Referer: sourceUrl,
          },
          {
            "User-Agent": userAgent,
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
        ];

  let lastStatus = 0;
  for (const headers of attempts) {
    const upstream = await fetch(remoteUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    lastStatus = upstream.status;
    const contentType = upstream.headers.get("content-type") ?? "";
    if (upstream.ok && upstream.body && contentType.toLowerCase().startsWith("image/")) {
      return upstream;
    }
    await upstream.body?.cancel().catch(() => undefined);
  }

  throw new Error(`Image CDN returned HTTP ${lastStatus || "unknown"}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") as ImagePlatform | null;
  const sourceUrl = searchParams.get("url");
  const index = Number(searchParams.get("index"));
  const download = searchParams.get("download") === "1";
  const outputFormat = download
    ? getRequestedOutputFormat(searchParams.get("format"))
    : null;

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

    const upstream = await fetchImageUpstream(image.remoteUrl, platform, sourceUrl);
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const finalExtension = outputFormat ?? image.extension;
    const finalContentType =
      outputFormat === "jpg"
        ? "image/jpeg"
        : outputFormat === "png"
          ? "image/png"
          : contentType;

    const headers = new Headers({
      "Content-Type": finalContentType,
      "Cache-Control": download
        ? "private, no-store"
        : "public, max-age=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    });

    if (download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${platform}-${index + 1}.${finalExtension}"`,
      );
    }

    if (outputFormat && upstream.body) {
      return new Response(
        Readable.toWeb(convertImageStream(upstream.body, outputFormat)) as any,
        { headers },
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
