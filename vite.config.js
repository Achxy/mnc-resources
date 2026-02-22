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
        target: process.env.VITE_CDN_BASE_URL || "https://cdn.example.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/contents\//, "/"),
      },
    },
  },
});
