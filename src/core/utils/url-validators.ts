export type PlatformType =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "twitter"
  | "threads";

function parseHttpUrl(rawUrl: string): URL | null {
  const value = rawUrl.trim();
  if (!value) return null;

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`,
    );
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function matchesHost(hostname: string, domains: string[]): boolean {
  const host = hostname.toLowerCase();
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isValidYoutubeUrl(rawUrl: string): boolean {
  const url = parseHttpUrl(rawUrl);
  if (!url) return false;

  if (matchesHost(url.hostname, ["youtu.be"])) {
    return /^\/[\w-]{11}(?:\/|$)/.test(url.pathname);
  }
  if (!matchesHost(url.hostname, ["youtube.com"])) return false;

  const playlistId = url.searchParams.get("list");
  if (
    playlistId &&
    /^[\w-]+$/.test(playlistId) &&
    (url.pathname === "/playlist" || url.pathname === "/watch")
  ) {
    return true;
  }

  const videoId = url.searchParams.get("v");
  if (url.pathname === "/watch" && videoId) return /^[\w-]{11}$/.test(videoId);
  return /^\/(?:shorts|embed|live)\/[\w-]{11}(?:\/|$)/.test(url.pathname);
}

export function isValidTikTokUrl(rawUrl: string): boolean {
  const url = parseHttpUrl(rawUrl);
  if (!url || !matchesHost(url.hostname, ["tiktok.com"])) return false;
  if (["vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname.toLowerCase())) {
    return url.pathname.length > 1;
  }
  return /^\/@[^/]+\/(?:video|photo)\/\d+(?:\/|$)/.test(url.pathname) ||
    /^\/v\/\d+(?:\/|$)/.test(url.pathname);
}

export function isValidInstagramUrl(rawUrl: string): boolean {
  const url = parseHttpUrl(rawUrl);
  return Boolean(
    url &&
      matchesHost(url.hostname, ["instagram.com"]) &&
      (/^\/(?:p|reel|reels|tv)\/[\w-]+(?:\/|$)/.test(url.pathname) ||
        /^\/stories\/(?:highlights\/)?[\w.-]+(?:\/|$)/.test(url.pathname)),
  );
}

export function isValidFacebookUrl(rawUrl: string): boolean {
  const url = parseHttpUrl(rawUrl);
  if (!url || !matchesHost(url.hostname, ["facebook.com", "fb.watch"])) {
    return false;
  }
  return url.pathname !== "/" || Boolean(url.searchParams.get("v"));
}

export function isValidTwitterUrl(rawUrl: string): boolean {
  const url = parseHttpUrl(rawUrl);
  return Boolean(
    url &&
      matchesHost(url.hostname, ["twitter.com", "x.com"]) &&
      /^\/[^/]+\/status\/\d+(?:\/|$)/.test(url.pathname),
  );
}

export function isValidThreadsUrl(rawUrl: string): boolean {
  const url = parseHttpUrl(rawUrl);
  return Boolean(
    url &&
      matchesHost(url.hostname, ["threads.net", "threads.com"]) &&
      (/^\/@[\w.]+\/post\/[\w-]+(?:\/|$)/.test(url.pathname) ||
        /^\/t\/[\w-]+(?:\/|$)/.test(url.pathname)),
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
