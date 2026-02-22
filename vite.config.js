import { defineConfig } from "vite";

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
        target: "https://cdn.mnc.achus.casa",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/contents\//, "/"),
      },
    },
  },
});
