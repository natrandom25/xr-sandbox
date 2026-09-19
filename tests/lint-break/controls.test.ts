import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { lintAt } from "./lint";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

describe("G0-07 negative controls", () => {
  it("G0-07 clean code at a path in src/core passes lint", async () => {
    const messages = await lintAt("src/core/rng/x.ts", "export const add = (a: number, b: number): number => a + b;\n");
    expect(messages).toHaveLength(0);
  });

  it("G0-07 the same banned code in src/renderer does not trigger a core-only rule", async () => {
    const code = "export const a = Math.random() + Date.now() + performance.now() + Math.pow(2, 3) + 2 ** 3;\nexport const d = new Date();\n";
    const messages = await lintAt("src/renderer/app/x.ts", code);
    expect(messages.filter((m) => m.message.includes("core ban:"))).toHaveLength(0);
  });
});

describe("G0-10 test method", () => {
  it("G0-10 the normal lint run finds no errors", async () => {
    const eslint = new ESLint({ cwd: root });
    const results = await eslint.lintFiles(["."]);
    const errors = results.flatMap((r) => r.messages.filter((m) => m.severity === 2).map((m) => `${r.filePath}: ${m.message}`));
    expect(errors).toEqual([]);
  });

  it("G0-10 fixtures are inline strings, so no fixture files exist to exclude", () => {
    const names = readdirSync(here);
    expect(names.filter((n) => /fixture/i.test(n))).toEqual([]);
  });
});
