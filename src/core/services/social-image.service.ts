import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as cheerio from "cheerio";

export type ImagePlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "twitter"
  | "threads";

export interface SocialImageAsset {
  index: number;
  extension: string;
  previewPath: string;
  downloadPath: string;
}

interface ExtractedImage {
  remoteUrl: string;
  extension: string;
}

const execFileAsync = promisify(execFile);
const galleryDlPath = () =>
  process.env.GALLERY_DL_BINARY_PATH ?? "gallery-dl";

const PLATFORM_HOSTS: Record<ImagePlatform, RegExp> = {
  tiktok: /(^|\.)tiktok\.com$/i,
  instagram: /(^|\.)instagram\.com$/i,
  facebook: /(^|\.)(facebook\.com|fb\.watch)$/i,
  twitter: /(^|\.)(twitter\.com|x\.com)$/i,
  threads: /(^|\.)(threads\.net|threads\.com)$/i,
};

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "gif",
  "heic",
  "jpeg",
  "jpg",
  "png",
  "webp",
]);

export function isSupportedPostUrl(
  rawUrl: string,
  platform: ImagePlatform,
): boolean {
  try {
    const url = new URL(rawUrl);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      PLATFORM_HOSTS[platform].test(url.hostname)
    );
  } catch {
    return false;
  }
}

function inferExtension(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const queryFormat = url.searchParams.get("format")?.toLowerCase();
    if (queryFormat && IMAGE_EXTENSIONS.has(queryFormat)) return queryFormat;

    const match = url.pathname.match(/\.([a-z0-9]{2,5})$/i);
    const extension = match?.[1]?.toLowerCase();
    if (extension && IMAGE_EXTENSIONS.has(extension)) return extension;
  } catch {}
  return null;
}

function uniqueImages(urls: string[]): ExtractedImage[] {
  const seen = new Set<string>();
  const images: ExtractedImage[] = [];

  for (const rawUrl of urls) {
    if (images.length >= 20) break;
    const url = rawUrl.trim();
    const extension = inferExtension(url);
    if (!extension || seen.has(url)) continue;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
    } catch {
      continue;
    }

    seen.add(url);
    images.push({ remoteUrl: url, extension });
  }

  return images;
}

async function extractWithGalleryDl(url: string): Promise<ExtractedImage[]> {
  const { stdout } = await execFileAsync(
    galleryDlPath(),
    ["--get-urls", "--no-download", "--quiet", url],
    {
      timeout: 45_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    },
  );

  return uniqueImages(stdout.split(/\r?\n/));
}

function collectThreadImageCandidates(value: unknown, urls: string[]): void {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) collectThreadImageCandidates(item, urls);
    return;
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.candidates)) {
    const best = record.candidates
      .filter((candidate): candidate is Record<string, unknown> =>
        Boolean(candidate && typeof candidate === "object"),
      )
      .sort(
        (a, b) =>
          Number(b.width) * Number(b.height) -
          Number(a.width) * Number(a.height),
      )[0];
    if (best && typeof best.url === "string") urls.push(best.url);
  }

  const width = Number(record.width);
  const height = Number(record.height);
  const candidateUrl =
    typeof record.url === "string"
      ? record.url
      : typeof record.src === "string"
        ? record.src
        : null;

  if (candidateUrl && width >= 300 && height >= 300) {
    urls.push(candidateUrl);
  }

  for (const [key, child] of Object.entries(record)) {
    if (key === "candidates") continue;
    collectThreadImageCandidates(child, urls);
  }
}

async function extractThreadsImages(url: string): Promise<ExtractedImage[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Threads returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const urls: string[] = [];

  $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content) urls.push(content);
  });

  $('script[type="application/json"], script[type="application/ld+json"]').each(
    (_, el) => {
      const json = $(el).text().trim();
      if (!json) return;
      try {
        collectThreadImageCandidates(JSON.parse(json), urls);
      } catch {}
    },
  );

  return uniqueImages(urls);
}

export async function extractSocialImages(
  sourceUrl: string,
  platform: ImagePlatform,
): Promise<ExtractedImage[]> {
  if (!isSupportedPostUrl(sourceUrl, platform)) {
    throw new Error(`Unsupported ${platform} URL`);
  }

  if (platform === "threads") {
    return extractThreadsImages(sourceUrl);
  }

  return extractWithGalleryDl(sourceUrl);
}

export async function getSocialImageAssets(
  sourceUrl: string,
  platform: ImagePlatform,
): Promise<SocialImageAsset[]> {
  const images = await extractSocialImages(sourceUrl, platform);
  const queryBase = new URLSearchParams({ platform, url: sourceUrl });

  return images.map((image, index) => {
    const params = new URLSearchParams(queryBase);
    params.set("index", String(index));

    return {
      index,
      extension: image.extension,
      previewPath: `/internal/media/image?${params.toString()}`,
      downloadPath: `/internal/media/image?${params.toString()}&download=1`,
    };
  });
}
