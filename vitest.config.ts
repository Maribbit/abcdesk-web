import { defineConfig } from "vitest/config";
import { buildStampDefines, readBuildStamp } from "./src/build/stamp.ts";

export default defineConfig({
  // The tests run against the same stamp the bundle carries, so a suite that
  // reads it sees this repository rather than a placeholder.
  define: buildStampDefines(readBuildStamp(new URL(".", import.meta.url))),
  test: {
    clearMocks: true,
    environment: "jsdom",
    // The portrait test reads the stylesheet's own numbers (`?raw` is a stub
    // while CSS handling is off), so the two files can be held against each
    // other instead of being restated in the test.
    css: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});