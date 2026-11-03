import { defineConfig } from "vite";

// Studio is the only build target. Set SITE_BASE when deploying under a subpath.
export default defineConfig({
  root: "src/studio",
  publicDir: "../../public",
  base: process.env.SITE_BASE ?? "/",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
  },
});
