import { describe, it } from "vitest";

// Integration tests requiring D1 + R2
// Skipped until @cloudflare/vitest-pool-workers supports vitest 4.x
describe.skip("admin routes", () => {
	describe("GET /api/admin/queue/count", () => {
		it("returns 401 for non-admin", () => {});
		it("returns pending count", () => {});
	});

	describe("GET /api/admin/queue", () => {
		it("returns queue with user info", () => {});
	});

	describe("POST /api/admin/review/:id", () => {
		it("returns 400 for invalid action", () => {});
		it("approves and sets status", () => {});
		it("reject deletes staged file", () => {});
		it("creates audit log entry", () => {});
	});

	describe("POST /api/admin/publish/:id", () => {
		it("publishes upload: copies staged to final, deletes staged", () => {});
		it("publishes rename: copies source to target, deletes source", () => {});
		it("publishes delete: deletes from R2", () => {});
		it("returns 500 for missing staged file", () => {});
		it("returns 404 for non-approved change", () => {});
	});

	describe("GET /api/admin/audit", () => {
		it("returns audit log entries", () => {});
		it("respects limit parameter", () => {});
		it("caps limit at 100", () => {});
	});
});
