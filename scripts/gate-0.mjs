import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { root } from "./run-app.mjs";

// npm run gate:0. Runs every auto check in docs/slice-0-gate.md, prints one line
// per gate id, and exits non-zero if any auto check fails or reports nothing.

const AUTO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22, 23].map((n) => `G0-${String(n).padStart(2, "0")}`);
const MANUAL = { "G0-16": "machine record", "G0-17": "first launch", "G0-18": "scene FPS", "G0-19": "labels", "G0-20": "startup limit", "G0-24": "baselines table" };

const results = new Map();
const record = (id, ok, detail) => {
  const prev = results.get(id);
  results.set(id, { ok: (prev?.ok ?? true) && ok, detail: [prev?.detail, detail].filter(Boolean).join(" | ") });
};

function run(label, command, args, { shell = false } = {}) {
  console.log(`> ${label}`);
  const r = spawnSync(command, args, { cwd: root, encoding: "utf8", shell });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  for (const line of out.split("\n")) {
    const m = line.match(/^CHECK (G0-\d\d) (PASS|FAIL) ?(.*)$/);
    if (m !== null) record(m[1], m[2] === "PASS", m[3]);
  }
  return { code: r.status ?? 1, out };
}

const node = process.execPath;
const typecheck = run("typecheck", "npm", ["run", "typecheck"], { shell: true });
if (typecheck.code !== 0) console.log(typecheck.out.split("\n").slice(-12).join("\n"));

const lint = run("lint", "npm", ["run", "lint"], { shell: true });
record("G0-10", lint.code === 0, `eslint exit=${lint.code}`);

const jsonFile = path.join(os.tmpdir(), `xr-vitest-${process.pid}.json`);
run("vitest", "npx", ["vitest", "run", "--reporter=json", `--outputFile=${jsonFile}`], { shell: true });
try {
  const report = JSON.parse(readFileSync(jsonFile, "utf8"));
  for (const file of report.testResults) {
    for (const t of file.assertionResults) {
      const id = t.fullName.match(/G0-\d\d/)?.[0];
      if (id !== undefined && t.status !== "todo") record(id, t.status === "passed", t.status === "passed" ? "" : `failed: ${t.title}`);
    }
  }
} catch {
  for (const id of ["G0-03", "G0-04", "G0-05", "G0-06", "G0-07", "G0-08", "G0-09"]) record(id, false, "vitest produced no report");
}

const pack = run("pack:dir", "npm", ["run", "pack:dir"], { shell: true });
record("G0-11", pack.code === 0, `electron-builder --dir exit=${pack.code}`);

for (const script of ["check-asar", "size-check", "smoke", "check-toolchain", "check-repo"]) {
  const r = run(script, node, [`scripts/${script}.mjs`]);
  if (r.code !== 0 && !r.out.includes("CHECK ")) console.log(r.out.split("\n").slice(-6).join("\n"));
}

console.log("\nGate 0 results");
let failed = 0;
for (const id of AUTO) {
  const r = results.get(id);
  if (r === undefined) {
    failed += 1;
    console.log(`${id}  FAIL  no result reported`);
  } else {
    if (!r.ok) failed += 1;
    console.log(`${id}  ${r.ok ? "PASS" : "FAIL"}  ${r.detail}`);
  }
}
for (const [id, what] of Object.entries(MANUAL)) console.log(`${id}  MANUAL  ${what}: recorded by hand, see npm run baseline`);
console.log(`\n${failed === 0 ? "All auto checks passed." : `${failed} auto check(s) failed.`} Sign-off goes in CHANGELOG.md.`);
process.exit(failed === 0 ? 0 : 1);
