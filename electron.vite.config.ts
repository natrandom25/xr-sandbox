import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import type { Plugin } from "vite";
import { DEV_CSP, STRICT_CSP } from "./electron/main/csp";

// Puts the CSP in index.html: strict for a build, relaxed for dev (G0-14).
function cspPlugin(): Plugin {
  let command: "build" | "serve" = "build";
  return {
    name: "xr-csp",
    configResolved(config) {
      command = config.command;
    },
    transformIndexHtml(html) {
      const policy = command === "build" ? STRICT_CSP : DEV_CSP;
      return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  };
}

const here = import.meta.dirname;

// No preload entry until Slice 1b.
export default defineConfig({
  main: {
    build: { rollupOptions: { input: { index: path.resolve(here, "electron/main/index.ts") } } },
  },
  renderer: {
    root: path.resolve(here, "src/renderer"),
    plugins: [react(), cspPlugin()],
    build: { rollupOptions: { input: path.resolve(here, "src/renderer/index.html") } },
  },
});
