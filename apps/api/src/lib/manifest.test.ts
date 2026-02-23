import { describe, it } from "vitest";

// Integration tests requiring R2
// Skipped until @cloudflare/vitest-pool-workers supports vitest 4.x
describe.skip("regenerateManifest", () => {
	it("generates manifest from R2 objects", () => {});
	it("filters out _staging/ keys", () => {});
	it("filters out the manifest file itself", () => {});
	it("builds sorted tree with directories before files", () => {});
	it("builds nested paths correctly", () => {});
	it("extracts file extensions correctly", () => {});
	it("sets correct httpMetadata on manifest", () => {});
	it("handles empty bucket", () => {});
});
