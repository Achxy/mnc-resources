import { describe, expect, it } from "vitest";
import { resetOtpEmail, verificationOtpEmail } from "./email-template";

describe("verificationOtpEmail", () => {
	it("contains the user's name", () => {
		const html = verificationOtpEmail("Alice", "123456");
		expect(html).toContain("Alice");
	});

	it("contains the OTP code", () => {
		const html = verificationOtpEmail("Alice", "654321");
		expect(html).toContain("654321");
	});

	it("contains verification-specific wording", () => {
		const html = verificationOtpEmail("Alice", "123456");
		expect(html).toContain("verify your email");
	});

	it("contains the 10-minute expiry notice", () => {
		const html = verificationOtpEmail("Alice", "123456");
		expect(html).toContain("10 minutes");
	});

	it("HTML-escapes special characters in name", () => {
		const html = verificationOtpEmail("<script>alert(1)</script>", "123456");
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain("<script>alert(1)</script>");
	});

	it("contains MnC Resources branding", () => {
		const html = verificationOtpEmail("Alice", "123456");
		expect(html).toContain("MnC Resources");
	});
});

describe("resetOtpEmail", () => {
	it("contains the user's name", () => {
		const html = resetOtpEmail("Bob", "789012");
		expect(html).toContain("Bob");
	});

	it("contains the OTP code", () => {
		const html = resetOtpEmail("Bob", "789012");
		expect(html).toContain("789012");
	});

	it("contains reset-specific wording", () => {
		const html = resetOtpEmail("Bob", "789012");
		expect(html).toContain("reset your password");
	});

	it("HTML-escapes special characters in name", () => {
		const html = resetOtpEmail('Bob "Admin"', "789012");
		expect(html).toContain("&quot;Admin&quot;");
	});
});
