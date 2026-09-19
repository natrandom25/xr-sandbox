import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import electronPath from "electron";
import { pkg, root } from "./run-app.mjs";

// G0-01 (versions pinned) and G0-02 (app name). Prints CHECK lines.

const problems = [];
const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };

for (const [name, version] of Object.entries(deps)) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push(`${name} is "${version}", not an exact version`);
}

const tracked = (file) => {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", file], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
if (!tracked("package-lock.json")) problems.push("package-lock.json is not committed");

const want = [
  ["react", "18."],
  ["typescript", "5.4."],
  ["three", "0.160."],
];
for (const [name, prefix] of want) {
  if (!String(deps[name]).startsWith(prefix)) problems.push(`${name} is ${deps[name]}, expected ${prefix}x`);
}

const electron = deps.electron;
const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
if (!changelog.includes(`Electron ${electron}`)) problems.push(`CHANGELOG.md does not name Electron ${electron}`);

// The Node used for dev and vitest must have the same major as the Node inside Electron.
let electronNode = "unknown";
try {
  electronNode = execFileSync(electronPath, ["-p", "process.versions.node"], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    encoding: "utf8",
  }).trim();
} catch (error) {
  problems.push(`could not read the Node version inside Electron: ${error.message}`);
}
const major = (v) => v.split(".")[0];
if (electronNode !== "unknown" && major(electronNode) !== major(process.versions.node)) {
  problems.push(`dev Node ${process.versions.node} vs Electron's Node ${electronNode}: majors differ`);
}

const ok1 = problems.length === 0;
console.log(`CHECK G0-01 ${ok1 ? "PASS" : "FAIL"} electron=${electron} devNode=${process.versions.node} electronNode=${electronNode}${ok1 ? "" : ` problems: ${problems.join("; ")}`}`);

const named = typeof pkg.name === "string" && pkg.name !== "" && typeof pkg.productName === "string" && pkg.productName !== "";
console.log(`CHECK G0-02 ${named ? "PASS" : "FAIL"} name=${pkg.name} productName=${pkg.productName}`);
process.exit(ok1 && named ? 0 : 1);
