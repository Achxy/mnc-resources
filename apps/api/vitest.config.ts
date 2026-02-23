import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "@mnc/api",
		include: ["src/**/*.test.ts"],
		environment: "node",
	},
});
