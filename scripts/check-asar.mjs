import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { listPackage } from "@electron/asar";
import { asarPath, root } from "./run-app.mjs";

// G0-12: asar is on, its listing is saved in docs, and it holds no tests, docs,
// scripts or source maps.

const asar = asarPath();
if (asar === null) {
  console.log("CHECK G0-12 FAIL no app.asar found (asar off, or no build). Run npm run pack:dir.");
  process.exit(1);
}

const files = listPackage(asar, { isPack: false })
  .map((f) => f.split(path.sep).join("/"))
  .sort();

const forbidden = files.filter((f) => /^\/?(tests|docs|scripts)\//.test(f) || f.endsWith(".map"));

const out = path.join(root, "docs", "slice-0-asar-listing.txt");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${files.join("\n")}\n`);

const ok = forbidden.length === 0;
console.log(`CHECK G0-12 ${ok ? "PASS" : "FAIL"} files=${files.length} forbidden=${forbidden.length} listing=docs/slice-0-asar-listing.txt`);
if (!ok) console.log(`INFO forbidden: ${forbidden.slice(0, 10).join(", ")}`);
process.exit(ok ? 0 : 1);
