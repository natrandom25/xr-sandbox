import { readFileSync } from "node:fs";
import path from "node:path";
import { MB, dirSizeBytes, root, unpackedDir } from "./run-app.mjs";

// G0-13. Prints the --dir size in MB. Exits non-zero above the ceiling.
// Ceiling = the Slice 0 size recorded in the Baselines table of docs/build-order.md,
// times 1.2, rounded up to a whole MB. The 20% headroom was fixed before measuring.
// Use --measure to print the size without judging it.

const dir = unpackedDir();
if (dir === null) {
  console.log("CHECK G0-13 FAIL no --dir build found. Run npm run pack:dir.");
  process.exit(1);
}

const sizeMb = dirSizeBytes(dir) / MB;
console.log(`--dir size: ${sizeMb.toFixed(1)} MB`);
if (process.argv.includes("--measure")) process.exit(0);

const table = readFileSync(path.join(root, "docs", "build-order.md"), "utf8");
const row = table.split("\n").find((l) => l.startsWith("| Installed size (--dir build)"));
const cell = row?.split("|")[2] ?? "";
const match = cell.match(/(\d+(?:\.\d+)?)\s*MB/i);
if (match === null) {
  console.log("CHECK G0-13 FAIL no baseline recorded in the Baselines table yet (record it, see G0-24).");
  process.exit(1);
}

const baseline = Number(match[1]);
const ceiling = Math.ceil(baseline * 1.2);
const ok = sizeMb <= ceiling;
console.log(`CHECK G0-13 ${ok ? "PASS" : "FAIL"} size=${sizeMb.toFixed(1)} MB baseline=${baseline} MB ceiling=${ceiling} MB`);
process.exit(ok ? 0 : 1);
