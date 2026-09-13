const REDDIT_HOST_PATTERN = /(^|\.)reddit\.com$/i;
const REDDIT_SHORT_HOST_PATTERN = /(^|\.)redd\.it$/i;
const REDDIT_POST_ID_PATTERN = /^[a-z0-9]+$/i;
const REDDIT_SHARE_PATH_PATTERN =
  /^\/(?:r\/[^/]+\/)?s\/[a-z0-9_-]+\/?$/i;
const REDDIT_DIRECT_MEDIA_HOST = "packaged-media.redd.it";
const REDDIT_DIRECT_MEDIA_PATH_PATTERN = /\.(?:mp4|m4v|webm)$/i;

export interface RedditDownloadFilenameOptions {
  extension: string;
  mediaType: "image" | "video" | "audio";
  index?: number;
  username?: string | null;
  postId?: string | null;
  title?: string;
}

function parseUrl(rawUrl: string): URL | null {
  const value = rawUrl.trim();
  if (!value) return null;

  try {
    return new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : "https://" + value,
    );
  } catch {
    return null;
  }
}

function isHttpUrl(url: URL): boolean {
  return url.protocol === "https:" || url.protocol === "http:";
}

function sanitizeFilenamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
}

export function isRedditHost(hostname: string): boolean {
  return REDDIT_HOST_PATTERN.test(hostname.toLowerCase());
}

export function isRedditShortHost(hostname: string): boolean {
  return REDDIT_SHORT_HOST_PATTERN.test(hostname.toLowerCase());
}

export function isRedditShareUrl(rawUrl: string): boolean {
  const url = parseUrl(rawUrl);
  return Boolean(
    url &&
      isHttpUrl(url) &&
      isRedditHost(url.hostname) &&
      REDDIT_SHARE_PATH_PATTERN.test(url.pathname),
  );
}

export function isRedditDirectMediaUrl(rawUrl: string): boolean {
  const url = parseUrl(rawUrl);
  return Boolean(
    url &&
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === REDDIT_DIRECT_MEDIA_HOST &&
      REDDIT_DIRECT_MEDIA_PATH_PATTERN.test(url.pathname),
  );
}

export function getRedditDirectMediaId(rawUrl: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url || !isRedditDirectMediaUrl(rawUrl)) return null;

  const [mediaId, filename] = url.pathname.split("/").filter(Boolean);
  const source = mediaId || filename?.replace(REDDIT_DIRECT_MEDIA_PATH_PATTERN, "");
  return source && /^[a-z0-9_-]+$/i.test(source) ? source : null;
}

export function getRedditPostId(rawUrl: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url || !isHttpUrl(url)) return null;

  const pathname = url.pathname.replace(/\/+$/, "");
  if (isRedditShortHost(url.hostname)) {
    const shortMatch = pathname.match(/^\/([a-z0-9]+)$/i);
    return shortMatch?.[1] ?? null;
  }

  if (!isRedditHost(url.hostname)) return null;

  const commentMatch = pathname.match(
    /^\/(?:(?:r|user)\/[^/]+\/)?comments\/([a-z0-9]+)(?:\/|$)/i,
  );
  const galleryMatch = pathname.match(/^\/gallery\/([a-z0-9]+)(?:\/|$)/i);
  const postId = commentMatch?.[1] ?? galleryMatch?.[1] ?? null;

  return postId && REDDIT_POST_ID_PATTERN.test(postId) ? postId : null;
}

export function isValidRedditUrl(rawUrl: string): boolean {
  return Boolean(
    getRedditPostId(rawUrl) ||
      isRedditShareUrl(rawUrl) ||
      isRedditDirectMediaUrl(rawUrl),
  );
}

export function cleanRedditUrl(rawUrl: string): string {
  const url = parseUrl(rawUrl);
  const postId = getRedditPostId(rawUrl);
  if (!url) return rawUrl;

  if (isRedditDirectMediaUrl(rawUrl)) {
    return "https://" + REDDIT_DIRECT_MEDIA_HOST + url.pathname + url.search;
  }

  if (isRedditShareUrl(rawUrl)) {
    return "https://www.reddit.com" + url.pathname + url.search;
  }

  if (!postId) return rawUrl;

  if (isRedditShortHost(url.hostname)) {
    return "https://www.reddit.com/comments/" + postId;
  }

  if (!isRedditHost(url.hostname)) return rawUrl;
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  return "https://www.reddit.com" + pathname;
}

export function getRedditPostJsonUrl(rawUrl: string): string | null {
  const postId = getRedditPostId(rawUrl);
  return postId
    ? "https://www.reddit.com/comments/" + postId + ".json?raw_json=1"
    : null;
}

export function buildRedditDownloadFilename(
  rawUrl: string,
  options: RedditDownloadFilenameOptions,
): string {
  const username = options.username?.trim();
  const postId =
    options.postId?.trim() ||
    getRedditPostId(rawUrl) ||
    getRedditDirectMediaId(rawUrl);
  const title = options.title?.trim();
  const titlePart =
    title && !/^reddit\s+(?:video|image|post)\b/i.test(title)
      ? sanitizeFilenamePart(title)
      : "";
  const identity = [username, postId]
    .filter((part): part is string => Boolean(part))
    .map(sanitizeFilenamePart)
    .filter(Boolean)
    .join("-");
  const mediaPart = options.mediaType + "-" + String((options.index ?? 0) + 1);
  const extension = sanitizeFilenamePart(options.extension.toLowerCase()) || "bin";

  return (
    "reddit-" +
    [titlePart, identity || "post", mediaPart].filter(Boolean).join("-") +
    "." +
    extension
  );
}
