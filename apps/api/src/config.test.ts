import { describe, expect, it } from "vitest";
import { config } from "./config";

describe("config", () => {
	it("appOrigin is mnc.achus.casa", () => {
		expect(config.appOrigin).toBe("https://mnc.achus.casa");
	});

	it("apiBaseUrl is cms.achus.casa", () => {
		expect(config.apiBaseUrl).toBe("https://cms.achus.casa");
	});

	it("cookieDomain is .achus.casa", () => {
		expect(config.cookieDomain).toBe(".achus.casa");
	});

	it("devOrigin is localhost:5173", () => {
		expect(config.devOrigin).toBe("http://localhost:5173");
	});
});
