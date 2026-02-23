import { render, screen, waitFor } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { createManifestDirectory, createManifestFile } from "../../test/factories";

vi.mock("../../lib/config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 5000,
	THROTTLE_MS: 1000,
}));

vi.mock("../../lib/cache", () => ({
	fetchAndCache: vi.fn().mockResolvedValue(false),
}));

vi.mock("../../lib/url", () => ({
	resolveContentUrl: (path: string) => path,
	isCrossOrigin: () => false,
}));

describe("PreviewPane", () => {
	it("shows placeholder when node is null", async () => {
		const { PreviewPane } = await import("./PreviewPane");
		render(() => <PreviewPane node={null} />);
		expect(screen.getByText("Hover over an item on the left to preview it.")).toBeInTheDocument();
	});

	it("shows ASCII tree for directory", async () => {
		const { PreviewPane } = await import("./PreviewPane");
		const dir = createManifestDirectory({
			name: "TestDir",
			children: [createManifestFile({ name: "a.pdf" }), createManifestFile({ name: "b.pdf" })],
		});

		render(() => <PreviewPane node={dir} />);

		await waitFor(() => {
			expect(screen.getByText(/TestDir/)).toBeInTheDocument();
		});
	});

	it("shows 'No preview available' for unsupported file types", async () => {
		const { PreviewPane } = await import("./PreviewPane");

		// Mock cache to return an ok response (blob creation still works)
		const { fetchAndCache } = await import("../../lib/cache");
		vi.mocked(fetchAndCache).mockImplementation(async (url) => {
			const cache = await caches.open("test-cache");
			await cache.put(url, new Response("content", { status: 200 }));
			return false;
		});

		const docxFile = createManifestFile({
			name: "doc.docx",
			path: "/contents/doc.docx",
			extension: "docx",
		});

		render(() => <PreviewPane node={docxFile} />);

		await waitFor(() => {
			expect(screen.getByText("No preview available for this item.")).toBeInTheDocument();
		});
	});

	it("shows loading status initially for files", async () => {
		const { PreviewPane } = await import("./PreviewPane");

		// Make fetchAndCache hang indefinitely
		const { fetchAndCache } = await import("../../lib/cache");
		vi.mocked(fetchAndCache).mockImplementation(() => new Promise(() => {}));

		const pdfFile = createManifestFile({
			name: "test.pdf",
			path: "/contents/test.pdf",
			extension: "pdf",
		});

		render(() => <PreviewPane node={pdfFile} />);
		expect(screen.getByText("Loading\u2026")).toBeInTheDocument();
	});
});
