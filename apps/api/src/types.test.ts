import { describe, expect, it } from "vitest";
import { generateId } from "./types";

describe("generateId", () => {
	it("returns a 32-character hex string", () => {
		const id = generateId();
		expect(id).toMatch(/^[0-9a-f]{32}$/);
	});

	it("has no dashes", () => {
		const id = generateId();
		expect(id).not.toContain("-");
	});

	it("generates unique IDs", () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()));
		expect(ids.size).toBe(100);
	});
});
