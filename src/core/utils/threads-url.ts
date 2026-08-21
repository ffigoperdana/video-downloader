const THREADS_HOST_PATTERN = /(^|\.)threads\.(?:net|com)$/i;
const THREADS_POST_ID = `[A-Za-z0-9_-]+`;

const THREADS_PATH_PATTERNS = [
  new RegExp(
    `^/@(?:[\\w.]+)?/post/${THREADS_POST_ID}(?:/media)?/?$`,
    "i",
  ),
  new RegExp(`^/t/${THREADS_POST_ID}(?:/media)?/?$`, "i"),
  new RegExp(`^/share/${THREADS_POST_ID}(?:/media)?/?$`, "i"),
];

export interface CleanThreadsUrlOptions {
  preserveQuery?: boolean;
}

function parseUrl(rawUrl: string): URL | null {
  const value = rawUrl.trim();
  if (!value) return null;

  try {
    return new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`,
    );
  } catch {
    return null;
  }
}

export function isThreadsHost(hostname: string): boolean {
  return THREADS_HOST_PATTERN.test(hostname.toLowerCase());
}

export function isValidThreadsUrl(rawUrl: string): boolean {
  const url = parseUrl(rawUrl);
  return Boolean(
    url &&
      (url.protocol === "https:" || url.protocol === "http:") &&
      isThreadsHost(url.hostname) &&
      THREADS_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname)),
  );
}

/**
 * Return a stable Threads URL while keeping the original path.
 * Tracking parameters such as xmt and ig_rid are not needed by the extractors,
 * except while resolving a /share link because xmt can be part of the share
 * hand-off token.
 */
export function cleanThreadsUrl(
  rawUrl: string,
  options: CleanThreadsUrlOptions = {},
): string {
  const url = parseUrl(rawUrl);
  if (
    !url ||
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    !isThreadsHost(url.hostname)
  ) {
    return rawUrl;
  }

  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const search = options.preserveQuery ? url.search : "";
  return `https://www.threads.com${pathname}${search}`;
}

export function isThreadsShareUrl(rawUrl: string): boolean {
  const url = parseUrl(rawUrl);
  return Boolean(
    url &&
      isThreadsHost(url.hostname) &&
      /^\/share\/[A-Za-z0-9_-]+(?:\/media)?\/?$/i.test(url.pathname),
  );
}

export function getThreadsPostId(rawUrl: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url || !isThreadsHost(url.hostname)) return null;

  const match = url.pathname.match(
    new RegExp(
      `^/(?:@(?:[\\w.]+)?/post|t|share)/(${THREADS_POST_ID})(?:/media)?/?$`,
      "i",
    ),
  );
  return match?.[1] ?? null;
}

export function getThreadsUsername(rawUrl: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url || !isThreadsHost(url.hostname)) return null;
  return url.pathname.match(/^\/@([\w.]+)\/post\//i)?.[1] ?? null;
}

/**
 * Some current post links are aliases without a username. Try the canonical
 * short permalink first, then keep the original URL as a fallback because
 * Threads can change which alias is resolvable without notice. A /share URL
 * is intentionally not converted to /t: its token is not the post id.
 */
export function getThreadsUrlCandidates(
  rawUrl: string,
  options: CleanThreadsUrlOptions = {},
): string[] {
  const cleanedUrl = cleanThreadsUrl(rawUrl, options);
  const candidates = [cleanedUrl];
  const parsedUrl = parseUrl(cleanedUrl);
  if (!parsedUrl) return candidates;

  const postId = getThreadsPostId(cleanedUrl);

  if (
    postId &&
    /^\/@\/post\//i.test(parsedUrl.pathname)
  ) {
    const suffix = options.preserveQuery ? parsedUrl.search : "";
    candidates.unshift(`https://www.threads.com/t/${postId}${suffix}`);
  }

  return [...new Set(candidates)];
}
