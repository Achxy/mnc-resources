import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";

// Start MSW server
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Cache API
const cacheStore = new Map<string, Response>();

const mockCache: Cache = {
	match: async (request: RequestInfo | URL) => {
		const key = typeof request === "string" ? request : (request as Request).url;
		const cached = cacheStore.get(key);
		return cached ? cached.clone() : undefined;
	},
	put: async (request: RequestInfo | URL, response: Response) => {
		const key = typeof request === "string" ? request : (request as Request).url;
		cacheStore.set(key, response.clone());
	},
	delete: async (request: RequestInfo | URL) => {
		const key = typeof request === "string" ? request : (request as Request).url;
		return cacheStore.delete(key);
	},
	add: async () => {},
	addAll: async () => {},
	keys: async () => [],
	matchAll: async () => [],
};

vi.stubGlobal("caches", {
	open: async () => mockCache,
	delete: async () => true,
	has: async () => true,
	keys: async () => [],
	match: async () => undefined,
});

// Expose cache store for test assertions
(globalThis as Record<string, unknown>).__testCacheStore = cacheStore;

// Mock URL.createObjectURL / revokeObjectURL (without overwriting the URL constructor)
let objectUrlCounter = 0;
URL.createObjectURL = () => `blob:mock-${++objectUrlCounter}`;
URL.revokeObjectURL = () => {};

// Mock requestIdleCallback
if (typeof globalThis.requestIdleCallback === "undefined") {
	vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
	vi.stubGlobal("cancelIdleCallback", (id: number) => clearTimeout(id));
}

// Clear cache store between tests
afterEach(() => {
	cacheStore.clear();
	objectUrlCounter = 0;
});
