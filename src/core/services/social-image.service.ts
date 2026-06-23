import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
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

function getSocialCookiePath(): string | null {
  const configuredPath = process.env.GALLERY_DL_COOKIES_PATH?.trim();
  if (configuredPath) return configuredPath;

  const encodedCookies = process.env.SOCIAL_COOKIES_BASE64?.trim();
  if (!encodedCookies) return null;
  generatedSocialCookiesPath ??= "/tmp/social-cookies.txt";
  writeFileSync(
    generatedSocialCookiesPath,
    Buffer.from(encodedCookies, "base64"),
    { mode: 0o600 },
  );
  return generatedSocialCookiesPath;
}

function getGalleryCookieArgs(): string[] {
  const cookiePath = getSocialCookiePath();
  return cookiePath ? ["--cookies", cookiePath] : [];
}

function getCookieHeader(rawUrl: string): string | null {
  const cookiePath = getSocialCookiePath();
  if (!cookiePath) return null;

  const url = new URL(rawUrl);
  const now = Math.floor(Date.now() / 1000);
  const cookies: string[] = [];

  for (const rawLine of readFileSync(cookiePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.startsWith("#HttpOnly_")
      ? rawLine.slice("#HttpOnly_".length)
      : rawLine;
    if (!line || line.startsWith("#")) continue;

    const [domain, , path, secure, expires, name, ...valueParts] =
      line.split("\t");
    if (!domain || !name) continue;
    const normalizedDomain = domain.replace(/^\./, "").toLowerCase();
    const hostname = url.hostname.toLowerCase();
    if (hostname !== normalizedDomain && !hostname.endsWith(`.${normalizedDomain}`)) {
      continue;
    }
    if (path && !url.pathname.startsWith(path)) continue;
    if (secure === "TRUE" && url.protocol !== "https:") continue;
    if (Number(expires) > 0 && Number(expires) < now) continue;
    cookies.push(`${name}=${valueParts.join("\t")}`);
  }

  return cookies.length ? cookies.join("; ") : null;
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

interface TikwmPayload {
  code?: number;
  data?: {
    images?: unknown;
  };
}

export function extractTikwmImageUrls(payload: TikwmPayload): string[] {
  if (payload.code !== 0 || !Array.isArray(payload.data?.images)) return [];
  return payload.data.images.filter(
    (image): image is string => typeof image === "string" && image.length > 0,
  );
}

async function extractTikTokViaTikwm(sourceUrl: string): Promise<ExtractedImage[]> {
  if (!/\/photo\/\d+\/?$/i.test(new URL(sourceUrl).pathname)) return [];

  const response = await fetch("https://www.tikwm.com/api/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
    },
    body: new URLSearchParams({ url: sourceUrl, hd: "1" }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`TikTok fallback returned ${response.status}`);

  const payload = (await response.json()) as TikwmPayload;
  return uniqueImagesWithDefault(extractTikwmImageUrls(payload), "jpeg");
}

function decodeEmbeddedUrl(value: string): string {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value
      .replaceAll("\\/", "/")
      .replaceAll("\\u0025", "%")
      .replaceAll("\\u0026", "&")
      .replaceAll("&amp;", "&");
  }
}

function isFacebookContentImage(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (!/(^|\.)(?:fbcdn\.net|facebook\.com)$/i.test(url.hostname)) return false;
    return !/\/v\/t\d+\.\d+-1\//.test(url.pathname);
  } catch {
    return false;
  }
}

export function extractFacebookEmbeddedImageUrls(html: string): string[] {
  const urls: string[] = [];
  const objectPattern =
    /"(?:image|photo_image|viewer_image|full_screen_image|large_image)"\s*:\s*\{([^{}]{0,1600})\}/g;

  for (const match of html.matchAll(objectPattern)) {
    const body = match[1];
    const urlMatch = body.match(/"(?:uri|url)"\s*:\s*"((?:\\.|[^"\\])+)"/);
    if (!urlMatch) continue;
    const width = Number(body.match(/"width"\s*:\s*(\d+)/)?.[1] ?? 0);
    const height = Number(body.match(/"height"\s*:\s*(\d+)/)?.[1] ?? 0);
    if (width > 0 && height > 0 && (width < 400 || height < 400)) continue;
    const decoded = decodeEmbeddedUrl(urlMatch[1]);
    if (isFacebookContentImage(decoded)) urls.push(decoded);
  }

  const byPath = new Map<string, string>();
  for (const imageUrl of urls) {
    try {
      const parsed = new URL(imageUrl);
      byPath.set(`${parsed.hostname}${parsed.pathname}`, imageUrl);
    } catch {}
  }
  return [...byPath.values()];
}

async function extractPageImages(url: string): Promise<ExtractedImage[]> {
  const cookie = getCookieHeader(url);
  const isFacebook = /(^|\.)facebook\.com$/i.test(new URL(url).hostname);
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        isFacebook && !cookie
          ? "facebookexternalhit/1.1"
          : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.8",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Social page returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content) urls.push(content);
  });

  if (isFacebook) {
    const embedded = extractFacebookEmbeddedImageUrls(html);
    if (embedded.length > 1) return uniqueImagesWithDefault(embedded, "jpg");
    urls.push(...embedded);
  }

  return uniqueImagesWithDefault(urls, "jpg");
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
    images: uniqueImagesWithDefault(imageUrls, "jpg"),
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
  if (platform === "tiktok") tasks.push(extractTikTokViaTikwm(sourceUrl));
  if (platform === "facebook") tasks.push(extractFacebookViaSnapSave(sourceUrl));

  const [galleryResult, pageResult, fallbackResult] = await Promise.allSettled(tasks);
  const gallery = galleryResult.status === "fulfilled" ? galleryResult.value : [];
  const page = pageResult.status === "fulfilled" ? pageResult.value : [];
  const fallback =
    fallbackResult?.status === "fulfilled" ? fallbackResult.value : [];
  return uniqueImages(
    [...gallery, ...page, ...fallback].map((image) => image.remoteUrl),
  );
}

export async function getSocialImageAssets(
  sourceUrl: string,
  platform: ImagePlatform,
): Promise<SocialImageAsset[]> {
  const images = await extractSocialImages(sourceUrl, platform);
  return toImageAssets(sourceUrl, platform, images);
}
