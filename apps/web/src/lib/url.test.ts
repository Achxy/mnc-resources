import { describe, expect, it, vi } from "vitest";

// Default mock — empty CDN URL (dev mode)
vi.mock("./config", () => ({
	CDN_BASE_URL: "",
	CMS_API_URL: "",
}));

describe("resolveContentUrl", () => {
	it("returns local path when CDN_BASE_URL is empty", async () => {
		const { resolveContentUrl } = await import("./url");
		expect(resolveContentUrl("/contents/test.pdf")).toBe("/contents/test.pdf");
	});

	it("encodes path segments with special characters", async () => {
		const { resolveContentUrl } = await import("./url");
		const result = resolveContentUrl("/contents/3rd Semester/notes (1).pdf");
		expect(result).toBe("/contents/3rd%20Semester/notes%20(1).pdf");
	});
});

describe("isCrossOrigin", () => {
	it("returns false when CDN_BASE_URL is empty", async () => {
		const { isCrossOrigin } = await import("./url");
		expect(isCrossOrigin()).toBe(false);
	});
});
