import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vite.dev/config/
export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [{ src: "node_modules/@litertjs/core/wasm/*", dest: "litert" }],
    }),
  ],
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["agari-wasm"],
  },
  server: {
    fs: {
      // Allow serving files from the wasm output directory
      allow: [".."],
    },
  },
}));
