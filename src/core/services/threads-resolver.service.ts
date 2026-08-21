import * as cheerio from "cheerio";
import {
  cleanThreadsUrl,
  getThreadsUrlCandidates,
  isThreadsHost,
  isThreadsShareUrl,
} from "@/core/utils/threads-url";

const THREADS_POST_PATH_PATTERN =
  /^\/(?:@(?:[\w.]+)?\/post|t)\/[A-Za-z0-9_-]+(?:\/media)?\/?$/i;
const THREADS_RESOLUTION_TTL_MS = 5 * 60 * 1000;
const THREADS_FAILED_RESOLUTION_TTL_MS = 30 * 1000;
const THREADS_RESOLUTION_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

const resolutionCache = new Map<
  string,
  { url: string; expiresAt: number }
>();
const resolutionInflight = new Map<string, Promise<string>>();

const THREADS_RESOLVER_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

function normalizeHtmlValue(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/\\u002f/gi, "/")
    .replace(/\\\//g, "/")
    .trim();
}

function normalizeResolvedPostUrl(
  rawUrl: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!rawUrl) return null;

  const value = normalizeHtmlValue(rawUrl);
  try {
    const url = new URL(value, baseUrl ?? "https://www.threads.com");
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !isThreadsHost(url.hostname) ||
      !THREADS_POST_PATH_PATTERN.test(url.pathname)
    ) {
      return null;
    }

    return cleanThreadsUrl(url.href);
  } catch {
    return null;
  }
}

function extractResolvedPostUrlFromHtml(
  html: string,
  baseUrl: string,
): string | null {
  const $ = cheerio.load(html);
  const metadataValues: string[] = [];

  $(
    [
      'link[rel="canonical"]',
      'meta[property="og:url"]',
      'meta[name="twitter:url"]',
      "[data-text-post-permalink]",
      "[data-instgrm-permalink]",
      "blockquote[cite]",
    ].join(","),
  ).each((_, element) => {
    const item = $(element);
    const value =
      item.attr("href") ??
      item.attr("content") ??
      item.attr("data-text-post-permalink") ??
      item.attr("data-instgrm-permalink") ??
      item.attr("cite");
    if (value) metadataValues.push(value);
  });

  for (const value of metadataValues) {
    const resolved = normalizeResolvedPostUrl(value, baseUrl);
    if (resolved) return resolved;
  }

  const normalizedHtml = normalizeHtmlValue(html);
  const urlPattern =
    /(?:https?:\/\/)?(?:www\.)?threads\.(?:com|net)\/(?:@(?:[\w.]+)?\/post|t)\/[A-Za-z0-9_-]+(?:\/media)?\/?/gi;

  for (const match of normalizedHtml.matchAll(urlPattern)) {
    const resolved = normalizeResolvedPostUrl(match[0], baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

async function fetchThreadsAliasPage(url: string): Promise<string | null> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: THREADS_RESOLVER_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(THREADS_RESOLUTION_TIMEOUT_MS),
    });

    const responseUrl = normalizeResolvedPostUrl(response.url);
    if (responseUrl) return responseUrl;

    const location = response.headers?.get("location");
    if (isRedirectStatus(response.status) && location) {
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        return null;
      }

      if (
        (nextUrl.protocol !== "https:" && nextUrl.protocol !== "http:") ||
        !isThreadsHost(nextUrl.hostname)
      ) {
        return null;
      }

      const resolvedRedirect = normalizeResolvedPostUrl(nextUrl.href);
      if (resolvedRedirect) return resolvedRedirect;

      currentUrl = cleanThreadsUrl(nextUrl.href, { preserveQuery: true });
      continue;
    }

    if (!response.ok || typeof response.text !== "function") return null;
    const html = await response.text();
    return extractResolvedPostUrlFromHtml(html, response.url || currentUrl);
  }

  return null;
}

async function resolveWithThreadsOEmbed(sourceUrl: string): Promise<string | null> {
  const endpoint = new URL("https://graph.threads.com/oembed");
  endpoint.searchParams.set("url", sourceUrl);

  try {
    const response = await fetch(endpoint, {
      headers: THREADS_RESOLVER_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(THREADS_RESOLUTION_TIMEOUT_MS),
    });
    if (!response.ok || typeof response.json !== "function") return null;

    const payload = (await response.json()) as {
      url?: unknown;
      html?: unknown;
    };
    const fromPayloadUrl =
      typeof payload.url === "string"
        ? normalizeResolvedPostUrl(payload.url)
        : null;
    if (fromPayloadUrl) return fromPayloadUrl;

    if (typeof payload.html === "string") {
      return extractResolvedPostUrlFromHtml(payload.html, sourceUrl);
    }
  } catch {
    // The oEmbed endpoint is an optional second resolver. Keep the original
    // share URL usable when the endpoint is unavailable or rate-limited.
  }

  return null;
}

async function resolveThreadsShareUrl(sourceUrl: string): Promise<string> {
  const pageUrl = await fetchThreadsAliasPage(sourceUrl).catch(() => null);
  if (pageUrl) return pageUrl;

  return (await resolveWithThreadsOEmbed(sourceUrl)) ?? sourceUrl;
}

export async function resolveThreadsUrl(rawUrl: string): Promise<string> {
  const sourceUrl = cleanThreadsUrl(rawUrl, { preserveQuery: true });
  if (!isThreadsShareUrl(sourceUrl)) return cleanThreadsUrl(sourceUrl);

  const cached = resolutionCache.get(sourceUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (cached) resolutionCache.delete(sourceUrl);

  const existing = resolutionInflight.get(sourceUrl);
  if (existing) return existing;

  const pending = resolveThreadsShareUrl(sourceUrl)
    .then((resolvedUrl) => {
      if (resolvedUrl !== sourceUrl) {
        resolutionCache.set(sourceUrl, {
          url: resolvedUrl,
          expiresAt: Date.now() + THREADS_RESOLUTION_TTL_MS,
        });
      } else {
        resolutionCache.set(sourceUrl, {
          url: resolvedUrl,
          expiresAt: Date.now() + THREADS_FAILED_RESOLUTION_TTL_MS,
        });
      }
      return resolvedUrl;
    })
    .finally(() => {
      resolutionInflight.delete(sourceUrl);
    });

  resolutionInflight.set(sourceUrl, pending);
  return pending;
}

export async function resolveThreadsUrlCandidates(rawUrl: string): Promise<string[]> {
  const sourceUrl = cleanThreadsUrl(rawUrl, { preserveQuery: true });
  const isShareUrl = isThreadsShareUrl(sourceUrl);
  const fallbackCandidates = getThreadsUrlCandidates(sourceUrl, {
    preserveQuery: isShareUrl,
  });

  if (!isShareUrl) return fallbackCandidates;

  const resolvedUrl = await resolveThreadsUrl(sourceUrl);
  const resolvedCandidates = getThreadsUrlCandidates(resolvedUrl);
  return [
    ...new Set([
      resolvedUrl,
      ...resolvedCandidates,
      ...fallbackCandidates,
    ]),
  ];
}
