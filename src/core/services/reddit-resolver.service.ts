import * as cheerio from "cheerio";
import {
  cleanRedditUrl,
  getRedditPostId,
  isRedditHost,
  isRedditShareUrl,
} from "@/core/utils/reddit-url";

const REDDIT_RESOLUTION_TTL_MS = 5 * 60 * 1000;
const REDDIT_FAILED_RESOLUTION_TTL_MS = 30 * 1000;
const REDDIT_RESOLUTION_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

const resolutionCache = new Map<string, { url: string; expiresAt: number }>();
const resolutionInflight = new Map<string, Promise<string>>();

const REDDIT_RESOLVER_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
};

function normalizeResolvedPostUrl(
  rawUrl: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl.replace(/&amp;/gi, "&").trim(), baseUrl);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !isRedditHost(url.hostname) ||
      !getRedditPostId(url.href)
    ) {
      return null;
    }

    return cleanRedditUrl(url.href);
  } catch {
    return null;
  }
}

function extractResolvedPostUrlFromHtml(
  html: string,
  baseUrl: string,
): string | null {
  const $ = cheerio.load(html);
  const values: string[] = [];

  $('link[rel="canonical"], meta[property="og:url"], meta[name="twitter:url"]')
    .each((_, element) => {
      const value = $(element).attr("href") ?? $(element).attr("content");
      if (value) values.push(value);
    });

  for (const value of values) {
    const resolved = normalizeResolvedPostUrl(value, baseUrl);
    if (resolved) return resolved;
  }

  const match = html.match(
    /https?:\/\/(?:[\w-]+\.)?reddit\.com\/(?:(?:r|user)\/[^/"'<\s]+\/)?comments\/[a-z0-9]+(?:\/[^"'<\s]*)?/i,
  );
  return normalizeResolvedPostUrl(match?.[0], baseUrl);
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

async function fetchRedditSharePage(sourceUrl: string): Promise<string | null> {
  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: REDDIT_RESOLVER_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(REDDIT_RESOLUTION_TIMEOUT_MS),
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
        !isRedditHost(nextUrl.hostname)
      ) {
        return null;
      }

      const resolvedRedirect = normalizeResolvedPostUrl(nextUrl.href);
      if (resolvedRedirect) return resolvedRedirect;

      currentUrl = cleanRedditUrl(nextUrl.href);
      continue;
    }

    if (!response.ok || typeof response.text !== "function") return null;
    return extractResolvedPostUrlFromHtml(
      await response.text(),
      response.url || currentUrl,
    );
  }

  return null;
}

export async function resolveRedditUrl(rawUrl: string): Promise<string> {
  const sourceUrl = cleanRedditUrl(rawUrl);
  if (!isRedditShareUrl(sourceUrl)) return sourceUrl;

  const cached = resolutionCache.get(sourceUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (cached) resolutionCache.delete(sourceUrl);

  const existing = resolutionInflight.get(sourceUrl);
  if (existing) return existing;

  const pending = fetchRedditSharePage(sourceUrl)
    .catch(() => null)
    .then((resolvedUrl) => {
      const url = resolvedUrl ?? sourceUrl;
      resolutionCache.set(sourceUrl, {
        url,
        expiresAt:
          Date.now() +
          (resolvedUrl
            ? REDDIT_RESOLUTION_TTL_MS
            : REDDIT_FAILED_RESOLUTION_TTL_MS),
      });
      return url;
    })
    .finally(() => {
      resolutionInflight.delete(sourceUrl);
    });

  resolutionInflight.set(sourceUrl, pending);
  return pending;
}
