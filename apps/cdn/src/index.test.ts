import { beforeEach, describe, expect, it } from "vitest";
import worker from "./index";

type WorkerEnv = Parameters<typeof worker.fetch>[1];

// Mock R2 object
const createMockR2Object = (body: string, contentType?: string) => ({
	body: new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(body));
			controller.close();
		},
	}),
	writeHttpMetadata(headers: Headers) {
		if (contentType) headers.set("Content-Type", contentType);
	},
	httpEtag: '"mock-etag"',
});

// Mock R2 bucket backed by a Map
const createMockR2Bucket = () => {
	const store = new Map<string, { value: string; httpMetadata?: { contentType?: string } }>();
	return {
		put: async (key: string, value: string, opts?: { httpMetadata?: { contentType?: string } }) => {
			store.set(key, { value, httpMetadata: opts?.httpMetadata });
		},
		get: async (key: string) => {
			const item = store.get(key);
			if (!item) return null;
			return createMockR2Object(item.value, item.httpMetadata?.contentType);
		},
		delete: async (key: string) => {
			store.delete(key);
		},
		list: async () => ({
			objects: [...store.keys()].map((key) => ({ key })),
		}),
	};
};

const makeRequest = (path: string, method = "GET") => {
	return new Request(`https://cdn.mnc.achus.casa${path}`, { method });
};

describe("CDN Worker", () => {
	let mockBucket: ReturnType<typeof createMockR2Bucket>;
	let env: WorkerEnv;

	beforeEach(async () => {
		mockBucket = createMockR2Bucket();
		env = {
			R2_BUCKET: mockBucket,
			ALLOWED_ORIGIN: "https://mnc.achus.casa",
		} as unknown as WorkerEnv;

		await mockBucket.put("test.pdf", "pdf content", {
			httpMetadata: { contentType: "application/pdf" },
		});
		await mockBucket.put("3rd Semester/notes.pdf", "notes content", {
			httpMetadata: { contentType: "application/pdf" },
		});
		await mockBucket.put("_staging/abc/file.pdf", "staged content");
	});

	describe("OPTIONS requests", () => {
		it("returns 204 with CORS headers", async () => {
			const res = await worker.fetch(makeRequest("/test.pdf", "OPTIONS"), env);
			expect(res.status).toBe(204);
			expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://mnc.achus.casa");
			expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
		});
	});

	describe("GET requests", () => {
		it("returns 404 for empty key", async () => {
			const res = await worker.fetch(makeRequest("/"), env);
			expect(res.status).toBe(404);
		});

		it("returns 404 for _staging/ keys", async () => {
			const res = await worker.fetch(makeRequest("/_staging/abc/file.pdf"), env);
			expect(res.status).toBe(404);
		});

		it("returns 404 for missing object", async () => {
			const res = await worker.fetch(makeRequest("/nonexistent.pdf"), env);
			expect(res.status).toBe(404);
		});

		it("returns 200 with body for existing object", async () => {
			const res = await worker.fetch(makeRequest("/test.pdf"), env);
			expect(res.status).toBe(200);
			expect(await res.text()).toBe("pdf content");
		});

		it("returns CORS headers", async () => {
			const res = await worker.fetch(makeRequest("/test.pdf"), env);
			expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://mnc.achus.casa");
		});

		it("returns ETag", async () => {
			const res = await worker.fetch(makeRequest("/test.pdf"), env);
			expect(res.headers.get("ETag")).toBeTruthy();
		});

		it("handles URL-encoded paths with spaces", async () => {
			const res = await worker.fetch(makeRequest("/3rd%20Semester/notes.pdf"), env);
			expect(res.status).toBe(200);
			expect(await res.text()).toBe("notes content");
		});
	});

	describe("HEAD requests", () => {
		it("returns 200 for existing object", async () => {
			const res = await worker.fetch(makeRequest("/test.pdf", "HEAD"), env);
			expect(res.status).toBe(200);
		});
	});

	describe("disallowed methods", () => {
		for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
			it(`returns 405 for ${method}`, async () => {
				const res = await worker.fetch(makeRequest("/test.pdf", method), env);
				expect(res.status).toBe(405);
				expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://mnc.achus.casa");
			});
		}
	});
});
