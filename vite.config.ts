import { defineConfig } from "vite";

// Workspace is the only build target. Set SITE_BASE when deploying under a subpath.
export default defineConfig({
  root: "src/workspace",
  publicDir: "../../public",
  base: process.env.SITE_BASE ?? "/",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
  },
});
