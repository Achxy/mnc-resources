import { describe, expect, it } from "vitest";
import {
	CACHE_NAME,
	IMAGE_EXTENSIONS,
	MIN_FULL_WIDTH,
	PASSIVE_LOAD_DELAY,
	THROTTLE_MS,
} from "./config";

describe("config constants", () => {
	it("CACHE_NAME is a non-empty string", () => {
		expect(CACHE_NAME).toBe("mnc-resource-cache-v1");
	});

	it("IMAGE_EXTENSIONS contains expected image types", () => {
		expect(IMAGE_EXTENSIONS.has("png")).toBe(true);
		expect(IMAGE_EXTENSIONS.has("jpg")).toBe(true);
		expect(IMAGE_EXTENSIONS.has("jpeg")).toBe(true);
		expect(IMAGE_EXTENSIONS.has("gif")).toBe(true);
		expect(IMAGE_EXTENSIONS.has("webp")).toBe(true);
		expect(IMAGE_EXTENSIONS.has("svg")).toBe(true);
	});

	it("IMAGE_EXTENSIONS does not contain non-image types", () => {
		expect(IMAGE_EXTENSIONS.has("pdf")).toBe(false);
		expect(IMAGE_EXTENSIONS.has("docx")).toBe(false);
	});

	it("MIN_FULL_WIDTH is 1000", () => {
		expect(MIN_FULL_WIDTH).toBe(1000);
	});

	it("PASSIVE_LOAD_DELAY is 5000", () => {
		expect(PASSIVE_LOAD_DELAY).toBe(5000);
	});

	it("THROTTLE_MS is 1000", () => {
		expect(THROTTLE_MS).toBe(1000);
	});
});
