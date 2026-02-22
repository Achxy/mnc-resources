import { defineConfig } from "vite";

const R2_CDN_ORIGIN = "https://cdn.mnc.achus.casa";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: "index.html",
    },
  },
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
    },
  },
});
