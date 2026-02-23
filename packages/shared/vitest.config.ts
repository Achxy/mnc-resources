import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "@mnc/shared",
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
});
