import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Shared helpers for the smoke and baseline scripts. Node built-ins only.

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

// The folder made by `electron-builder --dir`, or null if there is none.
export function unpackedDir() {
  const dist = path.join(root, "dist");
  if (!existsSync(dist)) return null;
  const hit = readdirSync(dist).find((n) => n.endsWith("-unpacked") || n === "mac" || n.startsWith("mac-"));
  return hit === undefined ? null : path.join(dist, hit);
}

export function appExecutable() {
  const dir = unpackedDir();
  if (dir === null) return null;
  const name = pkg.productName;
  const candidates = {
    win32: [path.join(dir, `${name}.exe`)],
    darwin: [path.join(dir, `${name}.app`, "Contents", "MacOS", name)],
    linux: [path.join(dir, pkg.name), path.join(dir, name)],
  }[process.platform] ?? [];
  return candidates.find((c) => existsSync(c)) ?? null;
}

export function asarPath() {
  const dir = unpackedDir();
  if (dir === null) return null;
  const options = [
    path.join(dir, "resources", "app.asar"),
    path.join(dir, `${pkg.productName}.app`, "Contents", "Resources", "app.asar"),
  ];
  return options.find((o) => existsSync(o)) ?? null;
}

export function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else if (entry.isFile()) total += statSync(full).size;
  }
  return total;
}

export const MB = 1024 * 1024;

function hasXvfb() {
  return spawnSync("which", ["xvfb-run"], { encoding: "utf8" }).status === 0;
}

// Run the packaged app with test flags. Resolves with the parsed XR_RESULT line.
export function runApp(args, { timeoutMs }) {
  const exe = appExecutable();
  if (exe === null) return Promise.reject(new Error("no packaged app found, run npm run pack:dir first"));

  const extra = [];
  if (process.platform === "linux") {
    // Chromium refuses to start as root without this. Only relevant in containers and CI.
    if (typeof process.getuid === "function" && process.getuid() === 0) extra.push("--no-sandbox");
    // Software WebGL for machines with no GPU, for example a container. Not for baselines.
    if (process.env.XR_SOFTWARE_GL === "1") {
      extra.push("--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist");
    }
  }
  const useXvfb = process.platform === "linux" && !process.env.DISPLAY && hasXvfb();
  const command = useXvfb ? "xvfb-run" : exe;
  const fullArgs = useXvfb ? ["-a", "-s", "-screen 0 1280x800x24", exe, ...extra, ...args] : [...extra, ...args];

  return new Promise((resolve) => {
    const child = spawn(command, fullArgs, { env: process.env });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      const line = stdout.split("\n").find((l) => l.startsWith("XR_RESULT "));
      let result = null;
      if (line !== undefined) {
        try {
          result = JSON.parse(line.slice("XR_RESULT ".length));
        } catch {
          result = null;
        }
      }
      resolve({ code, timedOut, result, stdout, stderr });
    });
  });
}
