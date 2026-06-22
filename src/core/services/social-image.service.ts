import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync } from "node:fs";
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

interface ExtractedVideo {
  remoteUrl: string;
  extension: string;
}

export interface ThreadsMediaAssets {
  images: SocialImageAsset[];
  videos: Array<{
    index: number;
    downloadPath: string;
  }>;
}

const execFileAsync = promisify(execFile);
const galleryDlPath = () =>
  process.env.GALLERY_DL_BINARY_PATH ?? "gallery-dl";
let generatedSocialCookiesPath: string | null = null;

function getGalleryCookieArgs(): string[] {
  const configuredPath = process.env.GALLERY_DL_COOKIES_PATH?.trim();
  if (configuredPath) return ["--cookies", configuredPath];

  const encodedCookies = process.env.SOCIAL_COOKIES_BASE64?.trim();
  if (!encodedCookies) return [];
  generatedSocialCookiesPath ??= "/tmp/social-cookies.txt";
  writeFileSync(
    generatedSocialCookiesPath,
    Buffer.from(encodedCookies, "base64"),
    { mode: 0o600 },
  );
  return ["--cookies", generatedSocialCookiesPath];
}

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

function uniqueImagesWithDefault(urls: string[], defaultExtension: string): ExtractedImage[] {
  const seen = new Set<string>();
  const images: ExtractedImage[] = [];
  for (const rawUrl of urls) {
    if (images.length >= 20) break;
    const url = rawUrl.trim();
    if (!url || seen.has(url)) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
    } catch {
      continue;
    }
    seen.add(url);
    images.push({
      remoteUrl: url,
      extension: inferExtension(url) ?? defaultExtension,
    });
  }
  return images;
}

export function decodeSnapSaveResponse(source: string): string {
  const match = source.match(
    /\}\("([^"]+)",\d+,"([^"]+)",(\d+),(\d+),\d+\)\)\s*$/,
  );
  if (!match) throw new Error("Unrecognized SnapSave response");

  const [, encoded, alphabet, shiftRaw, delimiterIndexRaw] = match;
  const shift = Number(shiftRaw);
  const base = Number(delimiterIndexRaw);
  const delimiter = alphabet[base];
  let decoded = "";

  for (const chunk of encoded.split(delimiter)) {
    if (!chunk) continue;
    let numeric = chunk;
    for (let index = 0; index < alphabet.length; index += 1) {
      numeric = numeric.replaceAll(alphabet[index], String(index));
    }
    decoded += String.fromCharCode(Number.parseInt(numeric, base) - shift);
  }

  return Buffer.from(decoded, "binary").toString("utf8");
}

function extractAssignedHtml(decoded: string): string {
  const match = decoded.match(
    /getElementById\(["']download-section["']\)\.innerHTML\s*=\s*"([\s\S]*?)"\s*;/,
  );
  if (!match) return decoded;
  return match[1]
    .replaceAll("\\/", "/")
    .replaceAll('\\"', '"')
    .replaceAll("\\n", "")
    .replaceAll("\\r", "");
}

async function extractFacebookViaSnapSave(sourceUrl: string): Promise<ExtractedImage[]> {
  const response = await fetch("https://snapsave.app/action.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://snapsave.app",
      Referer: "https://snapsave.app/",
      "User-Agent": "Mozilla/5.0",
    },
    body: new URLSearchParams({ url: sourceUrl }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Facebook fallback returned ${response.status}`);

  const html = extractAssignedHtml(decodeSnapSaveResponse(await response.text()));
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");
    const label = anchor.text().toLowerCase();
    if (href && !label.includes("mp4") && !label.includes("audio")) urls.push(href);
  });
  $("img[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (src && /(?:scontent|snapcdn|fbcdn)/i.test(src)) urls.push(src);
  });

  return uniqueImagesWithDefault(urls, "jpg");
}

async function extractWithGalleryDl(url: string): Promise<ExtractedImage[]> {
  let stdout = "";
  try {
    const result = await execFileAsync(
      galleryDlPath(),
      [
        "--get-urls",
        "--no-download",
        "--quiet",
        ...getGalleryCookieArgs(),
        url,
      ],
      {
        timeout: 15_000,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
      },
    );
    stdout = result.stdout;
  } catch (error) {
    const partial = error as { stdout?: string | Buffer };
    stdout = partial.stdout?.toString() ?? "";
    if (!stdout.trim()) throw error;
  }

  return uniqueImages(stdout.split(/\r?\n/));
}

async function extractPageImages(url: string): Promise<ExtractedImage[]> {
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
    throw new Error(`Social page returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const urls: string[] = [];

  $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content) urls.push(content);
  });

  return uniqueImages(urls);
}

async function extractThreadsViaLoveThreads(sourceUrl: string): Promise<{
  images: ExtractedImage[];
  videos: ExtractedVideo[];
}> {
  const body = new URLSearchParams({ q: sourceUrl, t: "media", lang: "en" });
  const response = await fetch("https://lovethreads.net/api/ajaxSearch", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://lovethreads.net",
      Referer: "https://lovethreads.net/en",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0",
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`Threads fallback returned ${response.status}`);
  const payload = (await response.json()) as { status?: string; data?: string };
  if (payload.status !== "ok" || !payload.data) {
    throw new Error("Threads fallback returned no media");
  }

  const $ = cheerio.load(payload.data);
  const imageUrls: string[] = [];
  const videoUrls: string[] = [];

  $(".download-box > li").each((_, element) => {
    const item = $(element);
    if (item.find(".icon-dlvideo").length) {
      const videoUrl =
        item.find('a[title="Download Video"]').attr("href") ??
        item.find(".download-items__btn a").attr("href");
      if (videoUrl) videoUrls.push(videoUrl);
      return;
    }

    if (item.find(".icon-dlimage").length) {
      const variants = item
        .find(".photo-option option")
        .map((__, option) => $(option).attr("value"))
        .get()
        .filter((value): value is string => Boolean(value));
      const imageUrl = variants[0] ?? item.find("img").attr("src");
      if (imageUrl) imageUrls.push(imageUrl);
    }
  });

  return {
    images: uniqueImages(imageUrls),
    videos: videoUrls.map((remoteUrl) => ({ remoteUrl, extension: "mp4" })),
  };
}

function toImageAssets(
  sourceUrl: string,
  platform: ImagePlatform,
  images: ExtractedImage[],
): SocialImageAsset[] {
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

export async function extractThreadsMedia(sourceUrl: string): Promise<{
  images: ExtractedImage[];
  videos: ExtractedVideo[];
}> {
  if (!isSupportedPostUrl(sourceUrl, "threads")) {
    throw new Error("Unsupported Threads URL");
  }
  return extractThreadsViaLoveThreads(sourceUrl);
}

export async function getThreadsMediaAssets(
  sourceUrl: string,
): Promise<ThreadsMediaAssets> {
  const media = await extractThreadsMedia(sourceUrl);
  const queryBase = new URLSearchParams({ platform: "threads", url: sourceUrl });
  return {
    images: toImageAssets(sourceUrl, "threads", media.images),
    videos: media.videos.map((_, index) => {
      const params = new URLSearchParams(queryBase);
      params.set("index", String(index));
      params.set("download", "1");
      return {
        index,
        downloadPath: `/internal/media/video?${params.toString()}`,
      };
    }),
  };
}

export async function extractSocialImages(
  sourceUrl: string,
  platform: ImagePlatform,
): Promise<ExtractedImage[]> {
  if (!isSupportedPostUrl(sourceUrl, platform)) {
    throw new Error(`Unsupported ${platform} URL`);
  }

  if (platform === "threads") {
    try {
      const media = await extractThreadsMedia(sourceUrl);
      return media.videos.length ? [] : media.images;
    } catch {
      return extractPageImages(sourceUrl);
    }
  }

  const tasks: Array<Promise<ExtractedImage[]>> = [
    extractWithGalleryDl(sourceUrl),
    extractPageImages(sourceUrl),
  ];
  if (platform === "facebook") tasks.push(extractFacebookViaSnapSave(sourceUrl));

  const [galleryResult, pageResult, facebookResult] = await Promise.allSettled(tasks);
  const gallery = galleryResult.status === "fulfilled" ? galleryResult.value : [];
  const page = pageResult.status === "fulfilled" ? pageResult.value : [];
  const facebook =
    facebookResult?.status === "fulfilled" ? facebookResult.value : [];
  return uniqueImages(
    [...gallery, ...page, ...facebook].map((image) => image.remoteUrl),
  );
}

export async function getSocialImageAssets(
  sourceUrl: string,
  platform: ImagePlatform,
): Promise<SocialImageAsset[]> {
  const images = await extractSocialImages(sourceUrl, platform);
  return toImageAssets(sourceUrl, platform, images);
}
