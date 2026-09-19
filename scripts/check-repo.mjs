import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { root } from "./run-app.mjs";

// G0-21 (1a gate exists), G0-22 (tree matches), G0-23 (changelog). Prints CHECK lines.

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const read = (file) => readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
const results = [];
const report = (id, ok, detail) => results.push({ id, ok, detail });

let tracked = [];
try {
  tracked = git("ls-files").split("\n").filter(Boolean);
} catch {
  console.log("CHECK G0-21 FAIL not a git repository");
  console.log("CHECK G0-22 FAIL not a git repository");
  console.log("CHECK G0-23 FAIL not a git repository");
  process.exit(1);
}

// G0-21
{
  const problems = [];
  if (!tracked.includes("docs/slice-1a-gate.md")) problems.push("docs/slice-1a-gate.md is not committed");
  else {
    const text = read("docs/slice-1a-gate.md");
    if (/\bTBD\b/i.test(text)) problems.push("contains TBD");
    const row = text.split("\n").find((l) => l.startsWith("| G1-08"));
    if (row === undefined || !/OPEN/.test(row) || !row.includes("1e-7") || !row.includes("1e-9")) {
      problems.push("G1-08 row missing, not marked OPEN, or tolerance not written");
    }
  }
  report("G0-21", problems.length === 0, problems.join("; ") || "1a gate committed, no TBD, G1-08 open with tolerance");
}

// G0-22: the tree in docs/folder-structure.md, read from git ls-files.
{
  const md = read("docs/folder-structure.md");
  const tree = md.slice(md.indexOf("\nxr-sandbox/"), md.indexOf("\n## Import rules")).split("\n");
  const expected = new Set();
  const stack = [];
  for (const line of tree) {
    const m = line.match(/^((?:│ {2}| {3})*)(?:├─|└─) (.*)$/);
    if (m === null) continue;
    const depth = m[1].length / 3 + 1;
    const names = [];
    for (const token of m[2].trim().split(/\s+/)) {
      if (!token.endsWith("/")) break;
      names.push(token.slice(0, -1));
    }
    if (names.length === 0) continue;
    const parent = depth > 1 ? stack[depth - 1] : "";
    for (const name of names) {
      const full = parent ? `${parent}/${name}` : name;
      const parts = full.split("/");
      for (let i = 1; i <= parts.length; i += 1) expected.add(parts.slice(0, i).join("/"));
    }
    stack[depth] = names.length === 1 ? (parent ? `${parent}/${names[0]}` : names[0]) : "";
  }

  const actual = new Set();
  for (const file of tracked) {
    const parts = file.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i += 1) actual.add(parts.slice(0, i).join("/"));
  }

  const top = (set) => new Set([...set].map((p) => p.split("/")[0]));
  const problems = [];
  for (const t of top(actual)) if (!top(expected).has(t)) problems.push(`unlisted top-level folder: ${t}`);
  for (const t of top(expected)) if (!top(actual).has(t)) problems.push(`missing top-level folder: ${t}`);
  for (const p of expected) if (p.startsWith("src/") && !actual.has(p)) problems.push(`missing folder: ${p}`);
  for (const p of actual) if (p.startsWith("src/") && !expected.has(p)) problems.push(`unlisted folder: ${p}`);
  report("G0-22", problems.length === 0, problems.join("; ") || `tree matches (${expected.size} listed folders)`);
}

// G0-23: only added lines, and a Slice 0 entry appended.
{
  const problems = [];
  const added = git("log", "--diff-filter=A", "--format=%H", "--", "CHANGELOG.md").trim().split("\n").filter(Boolean);
  if (added.length === 0) problems.push("CHANGELOG.md is not committed");
  else {
    const initial = git("show", `${added[added.length - 1]}:CHANGELOG.md`);
    const current = read("CHANGELOG.md");
    if (!current.startsWith(initial)) problems.push("an existing line was edited or removed");
    else if (!/^## .*Slice 0/m.test(current.slice(initial.length))) problems.push("no Slice 0 entry appended");
  }
  report("G0-23", problems.length === 0, problems.join("; ") || "only appended lines, Slice 0 entry present");
}

for (const r of results) console.log(`CHECK ${r.id} ${r.ok ? "PASS" : "FAIL"} ${r.detail}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
