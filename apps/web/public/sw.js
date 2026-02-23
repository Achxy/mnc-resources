const CACHE_VERSION = "v5";
const STATIC_CACHE = `static-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/index.html"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(key) =>
								(key.startsWith("static-") && key !== STATIC_CACHE) ||
								key.startsWith("mnc-resource-cache-"),
						)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	// Only handle same-origin requests — R2 content is cached by main thread
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(STATIC_CACHE);
			try {
				const response = await fetch(request);
				if (response?.ok) {
					cache.put(request, response.clone());
				}
				return response;
			} catch {
				const cached = await cache.match(request);
				if (cached) return cached;
				throw new Error("Network unavailable and no cache match");
			}
		})(),
	);
});
