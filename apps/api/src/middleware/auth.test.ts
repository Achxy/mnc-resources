import { describe, it } from "vitest";

// Integration tests requiring D1 + better-auth session resolution
// Skipped until @cloudflare/vitest-pool-workers supports vitest 4.x
describe.skip("auth middleware", () => {
	describe("requireSession", () => {
		it("returns 401 without session", () => {});
		it("returns 401 with unverified email", () => {});
		it("passes with valid verified session", () => {});
	});

	describe("requireAdmin", () => {
		it("returns 401 without session", () => {});
		it("returns 403 for non-admin", () => {});
		it("passes for admin", () => {});
	});
});
