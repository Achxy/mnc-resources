import { describe, it } from "vitest";

// Integration tests requiring D1 + R2
// Skipped until @cloudflare/vitest-pool-workers supports vitest 4.x
describe.skip("changes routes", () => {
	describe("POST /api/changes/upload", () => {
		it("returns 401 without session", () => {});
		it("returns 400 without file", () => {});
		it("returns 400 without targetPath", () => {});
		it("stages file to R2 and inserts row on success", () => {});
	});

	describe("POST /api/changes/rename", () => {
		it("returns 400 without paths", () => {});
		it("inserts rename row on success", () => {});
	});

	describe("POST /api/changes/delete", () => {
		it("returns 400 without targetPath", () => {});
		it("inserts delete row on success", () => {});
	});

	describe("GET /api/changes/count", () => {
		it("returns count for user's changes", () => {});
	});

	describe("GET /api/changes", () => {
		it("returns user's own changes", () => {});
		it("filters by status", () => {});
	});

	describe("DELETE /api/changes/:id", () => {
		it("returns 404 for non-existent or non-pending", () => {});
		it("returns 404 for another user's change", () => {});
		it("deletes staged R2 file and DB row", () => {});
	});
});
