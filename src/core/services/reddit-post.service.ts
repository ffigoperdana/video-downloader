import { getRedditPostJsonUrl } from "@/core/utils/reddit-url";

export interface RedditGalleryItem {
  media_id?: string;
  id?: string;
}

export interface RedditMediaMetadata {
  e?: string;
  s?: {
    u?: string;
    gif?: string;
    mp4?: string;
    x?: number;
    y?: number;
  };
  p?: Array<{
    u?: string;
    x?: number;
    y?: number;
  }>;
}

export interface RedditPost {
  id?: string;
  title?: string;
  selftext?: string;
  author?: string;
  subreddit?: string;
  subreddit_name_prefixed?: string;
  score?: number;
  num_comments?: number;
  is_video?: boolean;
  post_hint?: string;
  url?: string;
  url_overridden_by_dest?: string;
  thumbnail?: string;
  gallery_data?: {
    items?: RedditGalleryItem[];
  };
  media_metadata?: Record<string, RedditMediaMetadata>;
  media?: {
    reddit_video?: {
      duration?: number;
      fallback_url?: string;
      dash_url?: string;
      hls_url?: string;
    };
  };
  secure_media?: {
    reddit_video?: {
      duration?: number;
      fallback_url?: string;
      dash_url?: string;
      hls_url?: string;
    };
  };
  preview?: {
    images?: Array<{
      source?: {
        url?: string;
      };
    }>;
  };
}

interface RedditListingPayload {
  data?: {
    children?: Array<{
      data?: RedditPost;
    }>;
  };
}

const REDDIT_POST_CACHE_TTL_MS = 5 * 60 * 1000;
const postCache = new Map<string, { post: RedditPost; expiresAt: number }>();
const postInflight = new Map<string, Promise<RedditPost>>();

function normalizeRedditMediaUrl(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("\\u0026", "&")
    .replaceAll("\\/", "/")
    .trim();
}

function isRedditMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "i.redd.it" ||
    host.endsWith(".redd.it") ||
    host.endsWith(".redditmedia.com")
  );
}

export function isRedditImageUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(normalizeRedditMediaUrl(value));
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      isRedditMediaHost(url.hostname)
    );
  } catch {
    return false;
  }
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of urls) {
    const url = normalizeRedditMediaUrl(value);
    if (!isRedditImageUrl(url) || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }

  return result;
}

function getMetadataImageUrl(metadata: RedditMediaMetadata | undefined): string | null {
  const source = metadata?.s?.u;
  if (isRedditImageUrl(source)) return normalizeRedditMediaUrl(source);

  const previews = metadata?.p ?? [];
  for (let index = previews.length - 1; index >= 0; index -= 1) {
    const candidate = previews[index]?.u;
    if (isRedditImageUrl(candidate)) return normalizeRedditMediaUrl(candidate);
  }

  return null;
}

export function isRedditNativeVideo(post: RedditPost): boolean {
  return Boolean(
    post.is_video ||
      post.post_hint === "hosted:video" ||
      post.media?.reddit_video ||
      post.secure_media?.reddit_video,
  );
}

export function extractRedditImageUrls(post: RedditPost): string[] {
  if (isRedditNativeVideo(post)) return [];

  const galleryUrls: string[] = [];
  for (const item of post.gallery_data?.items ?? []) {
    const mediaId = item.media_id ?? item.id;
    if (!mediaId) continue;
    const imageUrl = getMetadataImageUrl(post.media_metadata?.[mediaId]);
    if (imageUrl) galleryUrls.push(imageUrl);
  }
  if (galleryUrls.length) return uniqueUrls(galleryUrls);

  const directUrls = [post.url_overridden_by_dest, post.url]
    .filter(isRedditImageUrl)
    .map(normalizeRedditMediaUrl);
  if (directUrls.length) return uniqueUrls(directUrls);

  const previewUrls = (post.preview?.images ?? [])
    .map((image) => image.source?.url)
    .filter(isRedditImageUrl)
    .map(normalizeRedditMediaUrl);
  return uniqueUrls(previewUrls);
}

export function getRedditPostThumbnail(post: RedditPost): string {
  const preview = post.preview?.images?.[0]?.source?.url;
  if (isRedditImageUrl(preview)) return normalizeRedditMediaUrl(preview);

  const image = extractRedditImageUrls(post)[0];
  if (image) return image;

  return isRedditImageUrl(post.thumbnail)
    ? normalizeRedditMediaUrl(post.thumbnail)
    : "";
}

export function getRedditVideoDuration(post: RedditPost): number {
  const duration =
    post.secure_media?.reddit_video?.duration ??
    post.media?.reddit_video?.duration;
  return Number(duration) || 0;
}

function readPostFromPayload(payload: unknown): RedditPost | null {
  const listing = Array.isArray(payload)
    ? (payload[0] as RedditListingPayload | undefined)
    : (payload as RedditListingPayload | undefined);
  const post = listing?.data?.children?.[0]?.data;
  return post && typeof post === "object" ? post : null;
}

async function fetchRedditPost(jsonUrl: string): Promise<RedditPost> {
  const response = await fetch(jsonUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SaveIt Media Downloader/1.0 (public media downloader)",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      throw new Error("This Reddit post is unavailable, private, or deleted.");
    }
    throw new Error("Reddit returned HTTP " + String(response.status));
  }

  const post = readPostFromPayload(await response.json());
  if (!post) {
    throw new Error("Reddit returned no public post metadata.");
  }
  return post;
}

export async function getRedditPost(rawUrl: string): Promise<RedditPost> {
  const jsonUrl = getRedditPostJsonUrl(rawUrl);
  if (!jsonUrl) throw new Error("Invalid Reddit post URL");

  const cached = postCache.get(jsonUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.post;
  if (cached) postCache.delete(jsonUrl);

  const existing = postInflight.get(jsonUrl);
  if (existing) return existing;

  const pending = fetchRedditPost(jsonUrl)
    .then((post) => {
      postCache.set(jsonUrl, {
        post,
        expiresAt: Date.now() + REDDIT_POST_CACHE_TTL_MS,
      });
      return post;
    })
    .finally(() => {
      postInflight.delete(jsonUrl);
    });

  postInflight.set(jsonUrl, pending);
  return pending;
}
