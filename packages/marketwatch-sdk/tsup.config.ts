import { defineConfig } from "tsup";

export default defineConfig([
  // Node + bundler builds (ESM + CJS) with type declarations
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
    treeshake: true,
    platform: "neutral",
    outDir: "dist",
  },
  // Standalone browser bundle (IIFE, minified) — drop-in <script> usage.
  // Exposes window.MarketWatch
  {
    entry: { "marketwatch.min": "src/index.ts" },
    format: ["iife"],
    globalName: "MarketWatch",
    minify: "terser",
    sourcemap: true,
    target: "es2018",
    platform: "browser",
    outDir: "dist/browser",
    dts: false,
    treeshake: true,
    splitting: false,
    legacyOutput: false,
    esbuildOptions(options) {
      options.legalComments = "none";
      options.drop = ["console", "debugger"];
      options.mangleProps = /^_/;
казать: true;
    },
    terserOptions: {
      compress: {
        passes: 3,
        pure_funcs: ["console.log", "console.debug"],
        ecma: 2018,
      },
      mangle: { toplevel: true },
      format: { comments: false },
    },
  },
]);