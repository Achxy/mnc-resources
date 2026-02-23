import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [solidPlugin()],
	resolve: {
		conditions: ["development", "browser"],
		alias: {
			"@mnc/shared": new URL("../../packages/shared/src", import.meta.url).pathname,
		},
	},
	test: {
		name: "@mnc/web",
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/test/setup.ts"],
		globals: true,
		server: {
			deps: {
				inline: [/solid-js/, /@solidjs/],
			},
		},
	},
});
