import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";

vi.mock("./config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
}));

describe("fetchManifest", () => {
	it("fetches and returns parsed manifest", async () => {
		const mockManifest = {
			rootLabel: "Contents",
			rootPath: "/contents",
			children: [{ name: "test.pdf", type: "file", path: "/contents/test.pdf", extension: "pdf" }],
		};

		server.use(
			http.get("*/resources-manifest.json", () => {
				return HttpResponse.json(mockManifest);
			}),
		);

		const { fetchManifest } = await import("./manifest-fetch");
		const result = await fetchManifest();
		expect(result.rootLabel).toBe("Contents");
		expect(result.children).toHaveLength(1);
	});

	it("throws on non-ok response", async () => {
		server.use(
			http.get("*/resources-manifest.json", () => {
				return new HttpResponse(null, { status: 500 });
			}),
		);

		const { fetchManifest } = await import("./manifest-fetch");
		await expect(fetchManifest()).rejects.toThrow("Failed to load manifest");
	});
});
