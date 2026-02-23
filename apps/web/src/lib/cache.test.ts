import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

vi.mock("./url", () => ({
	isCrossOrigin: () => false,
}));

describe("fetchAndCache", () => {
	let fetchAndCache: typeof import("./cache").fetchAndCache;
	const cacheStore = (globalThis as Record<string, unknown>).__testCacheStore as Map<
		string,
		Response
	>;

	beforeEach(async () => {
		// Re-import to pick up fresh mocks
		const mod = await import("./cache");
		fetchAndCache = mod.fetchAndCache;
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
		cacheStore?.clear();
	});

	it("returns true on cache hit without fetching", async () => {
		// Pre-populate cache
		const cache = await caches.open("test-cache");
		await cache.put("https://example.com/test.pdf", new Response("cached"));

		const result = await fetchAndCache("https://example.com/test.pdf");
		expect(result).toBe(true);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("fetches and caches on miss, returns false", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("fresh", { status: 200 }));

		const result = await fetchAndCache("https://example.com/new.pdf");
		expect(result).toBe(false);
		expect(fetch).toHaveBeenCalledOnce();

		// Should now be in cache
		const cache = await caches.open("test-cache");
		const cached = await cache.match("https://example.com/new.pdf");
		expect(cached).toBeTruthy();
	});

	it("does not cache non-ok responses", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("not found", { status: 404 }));

		const result = await fetchAndCache("https://example.com/missing.pdf");
		expect(result).toBe(false);

		const cache = await caches.open("test-cache");
		const cached = await cache.match("https://example.com/missing.pdf");
		expect(cached).toBeUndefined();
	});
});
