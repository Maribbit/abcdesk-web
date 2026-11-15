import { defineConfig } from "vitest/config";

export default defineConfig({
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