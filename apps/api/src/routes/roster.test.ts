import { describe, it } from "vitest";

// Integration tests requiring D1
// Skipped until @cloudflare/vitest-pool-workers supports vitest 4.x
describe.skip("POST /api/roster/lookup", () => {
	it("rejects non-3-digit suffix", () => {});
	it("rejects alpha suffix", () => {});
	it("returns 404 for unknown roll number", () => {});
	it("returns 409 when already registered", () => {});
	it("returns name and email for valid suffix", () => {});
});
