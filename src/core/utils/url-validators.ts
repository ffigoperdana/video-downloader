export type PlatformType =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "twitter"
  | "threads";

export function isValidYoutubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?.*v=|shorts\/)|youtu\.be\/)[\w\-]{11}/.test(
    url,
  );
}

export function isValidTikTokUrl(url: string): boolean {
  return /tiktok\.com\/([@\w.]+\/(?:video|photo)\/\d+|v\/\d+)|vm\.tiktok\.com|vt\.tiktok\.com/.test(
    url,
  );
}

export function isValidInstagramUrl(url: string): boolean {
  return /instagram\.com\/(p|reel|tv|reels|stories)\/[\w\-]+/.test(url);
}

export function isValidFacebookUrl(url: string): boolean {
  return /(?:facebook\.com|fb\.watch)\/.*/.test(url);
}

export function isValidTwitterUrl(url: string): boolean {
  return /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url);
}

export function isValidThreadsUrl(url: string): boolean {
  return /threads\.(?:net|com)\/(@[\w.]+\/post\/[\w-]+|t\/[\w-]+)/.test(
    url,
  );
}

export function isPlatformUrl(url: string): PlatformType | null {
  if (isValidYoutubeUrl(url)) return "youtube";
  if (isValidTikTokUrl(url)) return "tiktok";
  if (isValidInstagramUrl(url)) return "instagram";
  if (isValidFacebookUrl(url)) return "facebook";
  if (isValidTwitterUrl(url)) return "twitter";
  if (isValidThreadsUrl(url)) return "threads";
  return null;
}
