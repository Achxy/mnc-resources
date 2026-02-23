import { describe, it } from "vitest";

// Integration tests requiring D1 + better-auth
// Skipped until @cloudflare/vitest-pool-workers supports vitest 4.x
describe.skip("top-level API routes", () => {
	describe("GET /api/health", () => {
		it("returns ok", () => {});
	});

	describe("CORS", () => {
		it("allows appOrigin", () => {});
		it("allows devOrigin", () => {});
		it("rejects unknown origins", () => {});
	});

	describe("POST /api/auth/verify-and-setup", () => {
		it("returns 400 for missing fields", () => {});
		it("returns 400 for short password", () => {});
		it("returns 400 for invalid OTP", () => {});
		it("verifies email and updates password on valid OTP", () => {});
	});

	describe("POST /api/auth/send-reset-otp", () => {
		it("always returns ok (no email leak)", () => {});
	});

	describe("POST /api/auth/reset-with-otp", () => {
		it("returns 400 for missing fields", () => {});
		it("resets password on valid OTP", () => {});
	});
});
