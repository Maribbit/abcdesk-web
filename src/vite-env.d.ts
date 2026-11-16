/// <reference types="vite/client" />

// Burnt in by both configs from `src/build/stamp.ts`; `src/workspace/version.ts`
// is the only reader.
declare const __APP_VERSION__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_DATE__: string;

declare module "*.css?inline" {
  const css: string;
  export default css;
}