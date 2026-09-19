import { existsSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { MB, dirSizeBytes, root, runApp, unpackedDir } from "./run-app.mjs";

// G0-16 to G0-18. Prints numbers to paste into the Baselines table in
// docs/build-order.md. Baselines are recorded, not pass or fail.
// Usage: npm run baseline [-- --runs 5]

const runsFlag = process.argv.indexOf("--runs");
const runs = runsFlag > 0 ? Number(process.argv[runsFlag + 1]) : 5;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const dir = unpackedDir();
if (dir === null) {
  console.error("no packaged build. Run npm run pack:dir first.");
  process.exit(2);
}

const builtAt = statSync(path.join(root, "out", "main", "index.js")).mtimeMs;
const buildRecent = Date.now() - builtAt < 5 * 60 * 1000;

const starts = [];
let machine = null;
for (let i = 0; i < runs; i += 1) {
  const run = await runApp(["--xr-startup"], { timeoutMs: 60000 });
  if (run.result === null || typeof run.result.firstPaintMs !== "number") {
    console.error(`startup run ${i + 1} failed: exit=${run.code}`);
    process.exit(1);
  }
  starts.push(run.result.firstPaintMs);
  machine = run.result;
}

console.log("Measuring scene FPS. This takes a few minutes and needs the window visible.");
const fps = await runApp(["--xr-baseline"], { timeoutMs: 15 * 60 * 1000 });
const b = fps.result?.baseline;
if (b === undefined || b === null) {
  console.error(`baseline run failed: error=${fps.result?.error}`);
  process.exit(1);
}

const cpus = os.cpus();
const sizeMb = dirSizeBytes(dir) / MB;
const lines = [
  "## Machine record (G0-16)",
  `CPU: ${cpus[0]?.model} x${cpus.length}`,
  `RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB`,
  `OS: ${os.type()} ${os.release()} ${os.arch()}`,
  `GPU (WebGL): ${fps.result?.glRenderer}`,
  `GPU (Electron): ${JSON.stringify(machine?.gpu)}`,
  `Electron ${machine?.electron}, Node ${machine?.node}, V8 ${machine?.v8}`,
  "Disk type: fill in by hand (SATA SSD, NVMe or HDD)",
  `OS uptime: ${(os.uptime() / 3600).toFixed(1)} h. Build finished in the last 5 minutes: ${buildRecent ? "yes" : "no"}`,
  "",
  "## Numbers for the Baselines table",
  `Installed size (--dir build): ${sizeMb.toFixed(1)} MB`,
  `First-launch time: median ${median(starts).toFixed(0)} ms of ${runs} cold starts (runs: ${starts.map((s) => s.toFixed(0)).join(", ")} ms)`,
  `Empty Three.js scene FPS: ${b.emptyFps.toFixed(1)} (mean over ${b.measureSec} s after ${b.warmupSec} s warm-up, display ${machine?.displayHz} Hz)`,
  `Fixed-load scene FPS: ${b.fixedLoadFps.toFixed(1)} at N = ${b.triangles} triangles (range result: ${b.range})`,
  `N search: ${b.search.map((s) => `${s.triangles}=>${s.fps.toFixed(1)}`).join(", ")}`,
  "",
  "## Label (G0-19)",
  "Every number is provisional unless this machine is Intel UHD 620 class, 8 GB RAM, SATA SSD, Windows 10 or 11.",
  "Cold start rule: the app was closed and the OS not restarted between runs. This script starts a fresh process each time.",
];
console.log(lines.join("\n"));
if (!existsSync(dir)) process.exit(1);
