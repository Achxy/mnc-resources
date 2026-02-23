import { defineConfig } from "vite";

const R2_CDN_ORIGIN = "https://cdn.mnc.achus.casa";

export default defineConfig({
  server: {
    proxy: {
      "/contents": {
        target: R2_CDN_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/contents\//, "/"),
      },
      "/resources-manifest.json": {
        target: R2_CDN_ORIGIN,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
