import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiUrl, formatFileSize } from "./api";

// We must mock config before importing api, since it imports at module load
vi.mock("./config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

describe("apiUrl", () => {
	it("returns path as-is when CMS_API_URL is empty", () => {
		expect(apiUrl("/api/health")).toBe("/api/health");
	});
});

describe("apiFetch", () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn().mockResolvedValue(new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends credentials: include", async () => {
		await apiFetch("/api/health");
		expect(fetchSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ credentials: "include" }),
		);
	});

	it("sets Content-Type: application/json for JSON body", async () => {
		await apiFetch("/api/test", {
			method: "POST",
			body: JSON.stringify({ foo: "bar" }),
		});
		const [, opts] = fetchSpy.mock.calls[0];
		// apiFetch only sets Content-Type when body is present and not FormData
		// Headers may be a plain object or Headers instance
		const ct = opts.headers?.["Content-Type"] || opts.headers?.get?.("Content-Type");
		expect(ct).toBe("application/json");
	});

	it("does not set Content-Type for FormData body", async () => {
		const formData = new FormData();
		formData.append("file", new Blob(["data"]), "test.txt");
		await apiFetch("/api/upload", { method: "POST", body: formData });
		const [, opts] = fetchSpy.mock.calls[0];
		expect(opts.headers["Content-Type"]).toBeUndefined();
	});

	it("passes through method", async () => {
		await apiFetch("/api/test", { method: "DELETE" });
		expect(fetchSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ method: "DELETE" }),
		);
	});
});

describe("formatFileSize", () => {
	it("returns empty string for null", () => {
		expect(formatFileSize(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatFileSize(undefined)).toBe("");
	});

	it("returns empty string for 0", () => {
		expect(formatFileSize(0)).toBe("");
	});

	it("formats bytes", () => {
		expect(formatFileSize(500)).toBe("500 B");
	});

	it("formats kilobytes", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
	});

	it("formats megabytes", () => {
		expect(formatFileSize(1048576)).toBe("1.0 MB");
	});

	it("formats 2.5 MB", () => {
		expect(formatFileSize(2621440)).toBe("2.5 MB");
	});
});
