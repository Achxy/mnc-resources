import { describe, expect, it, vi } from "vitest";
import { generateOTP, hashPassword, sendEmail } from "./auth";

describe("generateOTP", () => {
	it("returns a 6-digit string", () => {
		const otp = generateOTP();
		expect(otp).toMatch(/^\d{6}$/);
	});

	it("returns a number in range 100000-999999", () => {
		for (let i = 0; i < 100; i++) {
			const num = Number.parseInt(generateOTP(), 10);
			expect(num).toBeGreaterThanOrEqual(100000);
			expect(num).toBeLessThanOrEqual(999999);
		}
	});
});

describe("hashPassword", () => {
	it("returns salt:hash format", async () => {
		const result = await hashPassword("testpass");
		expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
	});

	it("salt is 32 hex chars (16 bytes)", async () => {
		const result = await hashPassword("testpass");
		const [salt] = result.split(":");
		expect(salt).toMatch(/^[0-9a-f]{32}$/);
	});

	it("hash is 128 hex chars (64 bytes)", async () => {
		const result = await hashPassword("testpass");
		const [, hash] = result.split(":");
		expect(hash).toMatch(/^[0-9a-f]{128}$/);
	});

	it("generates different salts each call", async () => {
		const r1 = await hashPassword("testpass");
		const r2 = await hashPassword("testpass");
		const [salt1] = r1.split(":");
		const [salt2] = r2.split(":");
		expect(salt1).not.toBe(salt2);
	});
});

// Integration tests requiring D1 — skipped until @cloudflare/vitest-pool-workers supports vitest 4.x
describe.skip("storeOTP / verifyOTP", () => {
	it("storeOTP stores a code and verifyOTP retrieves it", () => {});
	it("verifyOTP deletes after successful verification", () => {});
	it("verifyOTP returns false for wrong code", () => {});
	it("verifyOTP returns false for missing entry", () => {});
	it("storeOTP replaces existing entry for same identifier", () => {});
	it("uses correct identifier format", () => {});
});

describe("sendEmail", () => {
	it("sends a POST to SMTP2GO API", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", fetchSpy);

		await sendEmail("api-key", "user@example.com", "Test Subject", "<p>Hello</p>");

		expect(fetchSpy).toHaveBeenCalledWith(
			"https://api.smtp2go.com/v3/email/send",
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/json" },
			}),
		);

		const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
		expect(body.api_key).toBe("api-key");
		expect(body.to).toEqual(["user@example.com"]);
		expect(body.subject).toBe("Test Subject");
		expect(body.html_body).toBe("<p>Hello</p>");

		vi.restoreAllMocks();
	});

	it("throws on non-ok response", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
		vi.stubGlobal("fetch", fetchSpy);

		await expect(sendEmail("key", "a@b.com", "sub", "html")).rejects.toThrow("SMTP2GO error 500");

		vi.restoreAllMocks();
	});
});
