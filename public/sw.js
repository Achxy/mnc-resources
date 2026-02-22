const CACHE_VERSION = "v4";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RESOURCE_CACHE = "mnc-resource-cache-v1";

const STATIC_ASSETS = ["/index.html", "/resources-manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) =>
            (key.startsWith("static-") && key !== STATIC_CACHE) ||
            (key.startsWith("mnc-resource-cache-") && key !== RESOURCE_CACHE)
          )
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

const cacheFirstResource = async (request) => {
  const cache = await caches.open(RESOURCE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
};

const networkFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
};

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // All content files (PDFs, images, etc.) use cache-first via shared resource cache
  if (url.pathname.startsWith("/contents/")) {
    event.respondWith(cacheFirstResource(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
