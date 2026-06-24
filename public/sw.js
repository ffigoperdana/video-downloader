const CACHE_VERSION = "v2";
const STATIC_CACHE = `saveit-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `saveit-dynamic-${CACHE_VERSION}`;

const PRECACHE_URLS = [];

// Skip download routes — never cache streaming content
const SKIP_CACHE_PATTERNS = ["/internal/"];

function isHttpRequest(request) {
  try {
    const url = new URL(request.url);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function shouldSkipRequest(request, url) {
  if (request.method !== "GET") return true;
  if (!isHttpRequest(request)) return true;
  if (request.headers.has("range")) return true;
  return SKIP_CACHE_PATTERNS.some((pattern) => url.pathname.includes(pattern));
}

function cacheableResponse(response) {
  return response && response.ok && response.type !== "error";
}

async function safePut(cacheName, request, response) {
  if (!cacheableResponse(response) || !isHttpRequest(request)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch {
    // Cache API can reject extension/devtools/special requests. Ignore safely.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (PRECACHE_URLS.length
      ? caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      : Promise.resolve()
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isHttpRequest(request)) return;

  const url = new URL(request.url);

  // Skip non-GET requests
  if (shouldSkipRequest(request, url)) return;

  // Skip download/preview routes — always fetch from network

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          safePut(STATIC_CACHE, request, response);
          return response;
        });
      }),
    );
    return;
  }

  // Pages/API: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("text/html")) {
          safePut(DYNAMIC_CACHE, request, response);
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
