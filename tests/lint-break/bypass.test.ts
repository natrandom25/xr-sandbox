import { describe, expect, it } from "vitest";
import { lintAt } from "./lint";

const CORE = "src/core/rng/x.ts";
const RULES = ["no-restricted-properties", "no-restricted-syntax"];

// G0-06: each bypass fails lint (rule id and message text asserted), or it is
// listed below as a known gap with a reason.
const bypasses = [
  { name: "destructured pow", code: "const { pow } = Math;\nexport const a = pow(2, 3);\n", text: "core ban: Math.pow" },
  { name: "computed literal Math['pow']", code: "export const a = Math['pow'](2, 3);\n", text: "core ban: Math.pow" },
  { name: "globalThis.Date.now()", code: "export const a = globalThis.Date.now();\n", text: "core ban: Date.now" },
];

describe("G0-06 bypass cases", () => {
  for (const b of bypasses) {
    it(`G0-06 ${b.name} fails lint`, async () => {
      const messages = await lintAt(CORE, b.code);
      const found = messages.filter(
        (m) => m.ruleId !== null && RULES.includes(m.ruleId) && m.message.includes(b.text),
      );
      expect(found.length).toBeGreaterThanOrEqual(1);
    });
  }

  // Known gaps. Each needs a reason. They are reported as todo, not as passing.
  it.todo("known gap: aliasing (const M = Math; M.pow(2, 3)). Name-based rules do not follow variables.");
  it.todo("known gap: Date() called without new. It returns the current time as a string.");
  it.todo("known gap: Reflect.get(Math, 'pow'). Dynamic property access is not visible to the rule.");
  it.todo("known gap: globalThis['Math'].pow(2, 3). A computed object name is not matched.");
});
