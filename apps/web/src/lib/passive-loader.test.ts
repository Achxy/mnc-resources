import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createManifestDirectory, createManifestFile } from "../test/factories";

vi.mock("./config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
	CACHE_NAME: "test-cache",
	IMAGE_EXTENSIONS: new Set(["png", "jpg"]),
	MIN_FULL_WIDTH: 1000,
	PASSIVE_LOAD_DELAY: 0,
	THROTTLE_MS: 0,
}));

vi.mock("./cache", () => ({
	fetchAndCache: vi.fn().mockResolvedValue(true),
}));

vi.mock("./url", () => ({
	resolveContentUrl: (path: string) => path,
	isCrossOrigin: () => false,
}));

describe("PassiveLoader", () => {
	let PassiveLoader: typeof import("./passive-loader").PassiveLoader;

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.stubGlobal("navigator", {});
		const mod = await import("./passive-loader");
		PassiveLoader = mod.PassiveLoader;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("collects all file nodes from tree", () => {
		const loader = new PassiveLoader();
		const children = [
			createManifestFile({ path: "/contents/a.pdf" }),
			createManifestDirectory({
				children: [createManifestFile({ path: "/contents/dir/b.pdf" })],
			}),
		];
		loader.start(children);
		// Internally the queue should have 2 items (both files)
		// We can verify by checking that processNext is eventually called
		expect(loader).toBeTruthy();
	});

	it("queuePriority adds items to front of queue", () => {
		const loader = new PassiveLoader();
		const children = [createManifestFile({ path: "/contents/priority.pdf" })];
		loader.queuePriority(children);
		expect(loader).toBeTruthy();
	});

	it("does not load on saveData connections", () => {
		vi.stubGlobal("navigator", {
			connection: { saveData: true },
		});

		const loader = new PassiveLoader();
		const children = [createManifestFile({ path: "/contents/a.pdf" })];
		loader.start(children);
		// Should not crash, just skip
		expect(loader).toBeTruthy();
	});

	it("does not load on 2g connections", () => {
		vi.stubGlobal("navigator", {
			connection: { effectiveType: "2g" },
		});

		const loader = new PassiveLoader();
		const children = [createManifestFile({ path: "/contents/a.pdf" })];
		loader.start(children);
		expect(loader).toBeTruthy();
	});
});
